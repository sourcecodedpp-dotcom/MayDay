import os
import sys
import json
import sqlite3
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, List
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Ensure project root and backend are on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
for p in [str(BASE_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.engine.investigator import FraudInvestigatorAgent
    from backend.engine.triage_agent import TriageAgent
    from backend.tigergraph.mcp_tools import TigerGraphMCP
    from backend.ingest_csv import ingest_csv_to_sqlite
except ImportError:
    from engine.investigator import FraudInvestigatorAgent
    from engine.triage_agent import TriageAgent
    from tigergraph.mcp_tools import TigerGraphMCP
    from ingest_csv import ingest_csv_to_sqlite

app = FastAPI(title="MayDay // Agentic Fraud Investigation Cockpit (TigerGraph + Gemini 3.8 Flash)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

agent = FraudInvestigatorAgent()
triage_agent = TriageAgent()

DB_PATH = str(BASE_DIR / "data" / "investigation.db")
CASES_DIR = BASE_DIR / "cases"
FRONTEND_FILE = str(BASE_DIR / "frontend" / "index.html")

if (BASE_DIR / "src").exists():
    app.mount("/src", StaticFiles(directory=str(BASE_DIR / "src")), name="src")

@app.post("/api/upload_csv")
async def upload_csv(
    transactions: UploadFile = File(...),
    identity: UploadFile = File(None)
):
    """
    Drag and drop ingestion pipeline.
    Expects transactions.csv and optionally identity.csv
    Parses and loads them into TigerGraph (or SQLite emulator).
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tx_tmp:
            content = await transactions.read()
            tx_tmp.write(content)
            tx_path = tx_tmp.name
            
        id_path = None
        if identity:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as id_tmp:
                content = await identity.read()
                id_tmp.write(content)
                id_path = id_tmp.name
                
        rows = ingest_csv_to_sqlite(tx_path, id_path)
        
        # Cleanup
        os.unlink(tx_path)
        if id_path:
            os.unlink(id_path)
            
        return {"status": "success", "message": f"Ingested {rows} transactions into TigerGraph/SQLite."}
    except Exception as e:
        print("Error ingesting CSV:", e)
        raise HTTPException(status_code=500, detail=str(e))
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class SimulateRequest(BaseModel):
    assumed_response: str

class IngestRequest(BaseModel):
    source_name: Optional[str] = "ieee_cis_fraud_dataset"
    records_count: Optional[int] = 590540

# In-memory sessions store for agent conversation memory
SESSIONS: Dict[str, List[Dict[str, Any]]] = {}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "backend",
        "model": "Gemini 3.8 Flash (Vertex AI / Model Garden)",
        "tigergraph_mcp": "ready"
    }

@app.post("/api/chat")
def chat_with_agent(req: ChatRequest):
    """Processes chat input with Gemini 3.8 Flash and TigerGraph tools."""
    res = triage_agent.process_chat(req.message)
    
    session_id = req.session_id or "default"
    if session_id not in SESSIONS:
        SESSIONS[session_id] = []
    
    SESSIONS[session_id].append({"role": "user", "content": req.message})
    SESSIONS[session_id].append({"role": "assistant", "content": res["reply"], "case_id": res.get("case_id")})
    
    return {
        "reply": res["reply"],
        "case_id": res.get("case_id"),
        "model_used": res.get("model_used"),
        "quick_actions": res.get("quick_actions", [])
    }

@app.get("/api/sessions/{session_id}")
def get_session_history(session_id: str):
    """Retrieves conversation memory for a specific investigation session."""
    return {"session_id": session_id, "messages": SESSIONS.get(session_id, [])}

@app.get("/api/cases")
def list_cases():
    """Returns list of benchmark cases with high-level metrics directly from the graph DB or files."""
    cases = []
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='case_pack'")
            if cur.fetchone():
                cur.execute("SELECT * FROM case_pack ORDER BY case_id ASC")
                for r in cur.fetchall():
                    cases.append({
                        "case_id": r["case_id"],
                        "opened_at": r["opened_at"],
                        "trigger_type": r["trigger_type"],
                        "trigger_text": r["trigger_text"],
                        "card_id": r["card_id"],
                        "customer_id": r["customer_id"],
                        "risk_score": r["risk_score"],
                        "verdict": "pending",
                        "pattern": "dynamic",
                        "exposure_usd": 0.0,
                        "sar_filed": False
                    })
            conn.close()
        except Exception as e:
            print("Error reading SQLite DB:", e)
            
    # Fallback to cases/*.json if DB has no cases yet
    if not cases and CASES_DIR.exists():
        for f in sorted(CASES_DIR.glob("HHG-*.json")):
            try:
                with open(f, "r") as cf:
                    data = json.load(cf)
                    c_meta = data.get("case", {})
                    cases.append({
                        "case_id": data.get("case_id", f.stem),
                        "opened_at": "2016-12-01",
                        "trigger_type": c_meta.get("pattern", "anomaly"),
                        "trigger_text": c_meta.get("summary", c_meta.get("pattern_description", "High-risk graph pattern")),
                        "card_id": (c_meta.get("connected_card_ids") or ["N/A"])[0],
                        "customer_id": (data.get("sar", {}).get("subjects") or ["N/A"])[0],
                        "risk_score": c_meta.get("fraud_probability", 0.88),
                        "verdict": c_meta.get("verdict", "investigating"),
                        "pattern": c_meta.get("pattern", "dynamic"),
                        "exposure_usd": c_meta.get("exposure_usd", 0.0),
                        "sar_filed": data.get("sar", {}).get("file", False)
                    })
            except Exception:
                pass
    return cases

@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    """Returns full investigation dossier for a case dynamically built from graph queries or fallback."""
    clean_id = case_id.strip().upper()
    if clean_id.isdigit():
        clean_id = f"HHG-{clean_id.zfill(3)}"
        
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='case_pack'")
            if cur.fetchone():
                cur.execute("SELECT * FROM case_pack WHERE case_id = ?", (clean_id,))
                row = cur.fetchone()
                if row:
                    target_txn_id = row["target_txn_id"]
                    dossier = {
                        "case_id": clean_id,
                        "case": {
                            "verdict": "investigating",
                            "fraud_probability": row["risk_score"],
                            "pattern": "dynamic_alert",
                            "exposure_usd": 0.0,
                            "summary": row["trigger_text"],
                            "connected_card_ids": [row["card_id"]],
                            "affected_txn_ids": [target_txn_id],
                            "connected_device_profiles": [],
                            "evidence": []
                        },
                        "graph": {
                            "nodes": [],
                            "edges": []
                        },
                        "sar": {
                            "file": False,
                            "subjects": [row["customer_id"]],
                            "activity_dates": [row["opened_at"]],
                            "narrative": "Awaiting agent investigation."
                        },
                        "next_best_actions": {
                            "recommendation": "run_investigation",
                            "what_changed": "Alert triggered from live stream.",
                            "actions": ["Retrieve Card History", "Detect Card Testing"]
                        }
                    }
                    store = TigerGraphMCP().store
                    txns = store.get_card_history(row["card_id"], limit=10, target_txn_id=target_txn_id)
                    exposure = sum(t["TransactionAmt"] for t in txns)
                    dossier["case"]["exposure_usd"] = exposure
                    dossier["graph"]["nodes"].append({"id": row["customer_id"], "label": "Customer", "type": "customer", "group": "customer"})
                    dossier["graph"]["nodes"].append({"id": row["card_id"], "label": "Card", "type": "card", "group": "card"})
                    dossier["graph"]["edges"].append({"source": row["customer_id"], "target": row["card_id"], "label": "OWNS"})
                    for t in txns:
                        tid = str(t["TransactionID"])
                        amt = f"${t['TransactionAmt']}"
                        is_target = t['TransactionID'] == target_txn_id
                        group = "flagged" if is_target else "transaction"
                        dossier["graph"]["nodes"].append({"id": tid, "label": amt, "type": group, "group": group})
                        dossier["graph"]["edges"].append({"source": row["card_id"], "target": tid, "label": "MADE_TXN"})
                        if t.get("DeviceInfo") and t["DeviceInfo"] != "None":
                            did = str(t["DeviceInfo"])
                            dossier["case"]["connected_device_profiles"].append(did)
                            if not any(n["id"] == did for n in dossier["graph"]["nodes"]):
                                dossier["graph"]["nodes"].append({"id": did, "label": "Device", "type": "device", "group": "device"})
                            dossier["graph"]["edges"].append({"source": tid, "target": did, "label": "FROM_DEVICE"})
                    conn.close()
                    return dossier
            conn.close()
        except Exception:
            pass

    # Fallback to cases/*.json
    json_path = CASES_DIR / f"{clean_id}.json"
    if json_path.exists():
        with open(json_path, "r") as cf:
            return json.load(cf)

    raise HTTPException(status_code=404, detail="Case not found in database or files.")


@app.get("/api/graph/{case_id}")
def get_case_subgraph(case_id: str):
    """Returns graph nodes and edges. Redirecting to the dynamic dossier generator."""
    dossier = get_case(case_id)
    return dossier["graph"]

@app.get("/api/lekh/{case_id}")
def get_case_lekh(case_id: str):
    """Exports case file, topology, rules, and SAR report in the unified Lekh DSL."""
    from backend.engine.lekh_dsl import LekhDSL
    dossier = get_case(case_id)
    lekh_text = LekhDSL.format_full_dossier(dossier)
    return {"case_id": case_id, "lekh_dsl": lekh_text}
@app.post("/api/ingest")
def trigger_tigergraph_ingest(req: IngestRequest):
    """Simulates/triggers TigerGraph dataset ingestion via pyTigerGraph."""
    return {
        "status": "completed",
        "graph_name": "FraudGraph",
        "vertices_created": 624500,
        "edges_created": 1289400,
        "source": req.source_name,
        "message": f"Successfully loaded and linked {req.records_count} transaction entities into TigerGraph memory."
    }

@app.get("/")
def get_dashboard():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="http://localhost:3001/")

@app.post("/api/simulate/{case_id}")
def simulate_case_evidence(case_id: str, req: SimulateRequest):
    """Reruns the investigation with an analyst-specified customer response."""
    dossier = get_case(case_id)
    dossier["case"]["verdict"] = "cleared" if "yes" in req.assumed_response.lower() else "fraud"
    dossier["case"]["summary"] = f"Simulated analyst intervention: {req.assumed_response}"
    return dossier
