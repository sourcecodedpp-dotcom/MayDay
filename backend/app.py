import os
import sys
import json
import sqlite3
from pathlib import Path
from typing import Optional

# Ensure project root and backend are on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
for p in [str(BASE_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

try:
    from backend.engine.investigator import FraudInvestigatorAgent
    from backend.tigergraph.mcp_tools import TigerGraphMCP
except ImportError:
    from engine.investigator import FraudInvestigatorAgent
    from tigergraph.mcp_tools import TigerGraphMCP

app = FastAPI(title="TigerGraph Agentic Fraud Investigation Cockpit (HHGOA 2026)")

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

DB_PATH = str(BASE_DIR / "data" / "investigation.db")
CASES_DIR = str(BASE_DIR / "cases")
FRONTEND_FILE = str(BASE_DIR / "frontend" / "index.html")

if (BASE_DIR / "src").exists():
    app.mount("/src", StaticFiles(directory=str(BASE_DIR / "src")), name="src")

class SimulateRequest(BaseModel):
    assumed_response: str

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "backend"}

@app.get("/api/cases")
def list_cases():
    """Returns list of 20 benchmark cases with high-level metrics."""
    conn = sqlite3.connect(DB_PATH)
    cases_df = pd.read_sql_query("SELECT * FROM case_pack ORDER BY case_id ASC", conn)
    conn.close()

    cases = []
    for idx, r in cases_df.iterrows():
        cid = r['case_id']
        fpath = os.path.join(CASES_DIR, f"{cid}.json")
        cached = {}
        if os.path.exists(fpath):
            with open(fpath, "r") as f:
                cached = json.load(f)
                
        cases.append({
            "case_id": cid,
            "opened_at": r["opened_at"],
            "trigger_type": r["trigger_type"],
            "trigger_text": r.get("trigger_text", ""),
            "card_id": r["card_id"],
            "customer_id": r["customer_id"],
            "risk_score": r["risk_score"] if pd.notna(r["risk_score"]) else None,
            "verdict": cached.get("case", {}).get("verdict", "pending"),
            "pattern": cached.get("case", {}).get("pattern", "pending"),
            "exposure_usd": cached.get("case", {}).get("exposure_usd", 0.0),
            "sar_filed": cached.get("sar", {}).get("file", False)
        })
    return cases

@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    """Returns full investigation dossier for a case."""
    fpath = os.path.join(CASES_DIR, f"{case_id}.json")
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="Case not found")
    with open(fpath, "r") as f:
        return json.load(f)

@app.get("/api/graph/{case_id}")
def get_case_subgraph(case_id: str):
    """
    Returns graph nodes and edges for the case to render in Cytoscape.
    """
    fpath = os.path.join(CASES_DIR, f"{case_id}.json")
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="Case not found")
        
    with open(fpath, "r") as f:
        case_data = json.load(f)
        
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT * FROM case_pack WHERE case_id = ?", (case_id,))
    meta = cur.fetchone()
    conn.close()
    
    cust_id = case_data["sar"]["subjects"][0] if case_data["sar"]["subjects"] else (meta[6] if meta else "Cust")
    card_id = meta[5] if meta else "Card"
    flagged_txn = str(meta[4]) if meta else "Txn"
    
    nodes = [
        {"id": cust_id, "label": f"Customer\n{cust_id}", "type": "customer", "group": "customer"},
        {"id": card_id, "label": f"Card\n{card_id}", "type": "card", "group": "card"},
        {"id": flagged_txn, "label": f"Flagged Txn\n{flagged_txn}", "type": "flagged_txn", "group": "flagged"}
    ]
    edges = [
        {"source": cust_id, "target": card_id, "label": "OWNS"},
        {"source": card_id, "target": flagged_txn, "label": "MADE"}
    ]

    dev_profiles = case_data["case"].get("connected_device_profiles", [])
    if dev_profiles:
        dev_id = "DeviceProfile"
        dev_label = dev_profiles[0].split("|")[0].strip()
        nodes.append({"id": dev_id, "label": f"Device\n{dev_label}", "type": "device", "group": "device"})
        edges.append({"source": flagged_txn, "target": dev_id, "label": "FROM_DEVICE"})

    for cc in case_data["case"].get("connected_card_ids", []):
        nodes.append({"id": cc, "label": f"Connected Card\n{cc}", "type": "connected_card", "group": "alert"})
        if dev_profiles:
            edges.append({"source": "DeviceProfile", "target": cc, "label": "SHARED_BY"})

    for sc in case_data["case"].get("similar_prior_cases", []):
        nodes.append({"id": sc, "label": f"Prior Case\n{sc}", "type": "prior_case", "group": "memory"})
        edges.append({"source": flagged_txn, "target": sc, "label": "SIMILAR_TO"})

    return {"nodes": nodes, "edges": edges}

@app.post("/api/simulate/{case_id}")
def simulate_case_evidence(case_id: str, req: SimulateRequest):
    """
    Reruns the investigation with an analyst-specified customer response.
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT * FROM case_pack WHERE case_id = ?", (case_id,))
    row = cur.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Case not found in case pack")

    col_names = ["case_id", "opened_at", "trigger_type", "trigger_text", "flagged_txn_id", "card_id", "customer_id", "risk_score"]
    meta = dict(zip(col_names, row))
    
    res = agent.investigate_case(meta, assumed_customer_reply=req.assumed_response)
    return res

@app.get("/")
def get_dashboard():
    if os.path.exists(FRONTEND_FILE):
        return FileResponse(FRONTEND_FILE, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return JSONResponse({"message": "Frontend not found", "docs": "/docs"})
