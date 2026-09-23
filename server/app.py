import os
import json
import sqlite3
import pandas as pd
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel

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

agent = FraudInvestigatorAgent()

class SimulateRequest(BaseModel):
    assumed_response: str

@app.get("/api/cases")
def list_cases():
    """Returns list of 20 benchmark cases with high-level metrics."""
    conn = sqlite3.connect('data/investigation.db')
    cases_df = pd.read_sql_query("SELECT * FROM case_pack ORDER BY case_id ASC", conn)
    conn.close()

    cases = []
    for idx, r in cases_df.iterrows():
        cid = r['case_id']
        fpath = f"cases/{cid}.json"
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
    fpath = f"cases/{case_id}.json"
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="Case not found")
    with open(fpath, "r") as f:
        return json.load(f)

@app.get("/api/graph/{case_id}")
def get_case_subgraph(case_id: str):
    """
    Returns graph nodes and edges for the case to render in Cytoscape/VisJS.
    Nodes: Customer, Card, FlaggedTxn, OtherTxns, DeviceProfile, ConnectedCards, PriorCases.
    Edges: OWNS, MADE, FROM_DEVICE, CONNECTED_TO, INVOLVED_IN.
    """
    fpath = f"cases/{case_id}.json"
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="Case not found")
        
    with open(fpath, "r") as f:
        case_data = json.load(f)
        
    conn = sqlite3.connect('data/investigation.db')
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

    # Add Device Profile node if exists
    dev_profiles = case_data["case"].get("connected_device_profiles", [])
    if dev_profiles:
        dev_id = "DeviceProfile"
        dev_label = dev_profiles[0].split("|")[0].strip()
        nodes.append({"id": dev_id, "label": f"Device\n{dev_label}", "type": "device", "group": "device"})
        edges.append({"source": flagged_txn, "target": dev_id, "label": "FROM_DEVICE"})

    # Add Connected Cards
    for cc in case_data["case"].get("connected_card_ids", []):
        nodes.append({"id": cc, "label": f"Connected Card\n{cc}", "type": "connected_card", "group": "alert"})
        if dev_profiles:
            edges.append({"source": "DeviceProfile", "target": cc, "label": "SHARED_BY"})

    # Add Similar Prior Cases
    for sc in case_data["case"].get("similar_prior_cases", []):
        nodes.append({"id": sc, "label": f"Prior Case\n{sc}", "type": "prior_case", "group": "memory"})
        edges.append({"source": flagged_txn, "target": sc, "label": "SIMILAR_TO"})

    return {"nodes": nodes, "edges": edges}

@app.post("/api/simulate/{case_id}")
def simulate_case_evidence(case_id: str, req: SimulateRequest):
    """
    Reruns the investigation with an analyst-specified customer response.
    Demonstrates interactive Next-Best-Action update in real time!
    """
    conn = sqlite3.connect('data/investigation.db')
    cur = conn.cursor()
    cur.execute("SELECT * FROM case_pack WHERE case_id = ?", (case_id,))
    row = cur.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Case not found in case pack")

    col_names = ["case_id", "opened_at", "trigger_type", "trigger_text", "flagged_txn_id", "card_id", "customer_id", "risk_score"]
    meta = dict(zip(col_names, row))
    
    # Run agent with analyst response
    res = agent.investigate_case(meta, assumed_customer_reply=req.assumed_response)
    return res

# Serve static dashboard
os.makedirs("frontend/dist", exist_ok=True)
app.mount("/static", StaticFiles(directory="frontend/dist"), name="static")

@app.get("/")
def get_dashboard():
    return FileResponse("frontend/dist/index.html")
