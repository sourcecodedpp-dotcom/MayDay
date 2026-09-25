import os
import re
import json
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional
import requests

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = str(BASE_DIR / "data" / "investigation.db")
CASES_DIR = str(BASE_DIR / "cases")

class TriageAgent:
    def __init__(self):
        self.project = 'persuasive-axe-506219-h9'
        self.location = 'global'
        self.model = 'gemini-3.8-flash'
        self.client = None
        
        try:
            from google import genai
            self.client = genai.Client(
                vertexai=True,
                project=self.project,
                location=self.location
            )
        except Exception as e:
            print(f"[TriageAgent] Vertex AI client initialization warning: {e}")

    def get_case_data(self, case_id: str) -> Dict[str, Any]:
        clean_id = case_id.strip().upper()
        if clean_id.isdigit():
            clean_id = f"HHG-{clean_id.zfill(3)}"
            
        fpath = os.path.join(CASES_DIR, f"{clean_id}.json")
        if os.path.exists(fpath):
            with open(fpath, "r") as f:
                return json.load(f)
                
        try:
            resp = requests.get(f"http://localhost:8000/api/cases/{clean_id}", timeout=2)
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
        return {"error": f"Case {clean_id} not found."}

    def list_all_cases(self) -> List[Dict[str, Any]]:
        cases = []
        if os.path.exists(DB_PATH):
            try:
                conn = sqlite3.connect(DB_PATH)
                cur = conn.cursor()
                cur.execute("SELECT case_id, opened_at, trigger_type, card_id, customer_id, risk_score FROM case_pack ORDER BY case_id ASC")
                rows = cur.fetchall()
                conn.close()
                for r in rows:
                    cid = r[0]
                    fpath = os.path.join(CASES_DIR, f"{cid}.json")
                    cached = {}
                    if os.path.exists(fpath):
                        with open(fpath, "r") as f:
                            cached = json.load(f)
                    c_info = cached.get("case", {})
                    cases.append({
                        "case_id": cid,
                        "opened_at": r[1],
                        "trigger": r[2],
                        "risk_score": r[5] or 0.0,
                        "verdict": c_info.get("verdict", "pending"),
                        "exposure_usd": c_info.get("exposure_usd", 0.0),
                        "pattern": c_info.get("pattern", "unclassified")
                    })
            except Exception as e:
                print(f"[TriageAgent] SQLite read error: {e}")
        return cases

    def process_chat(self, user_prompt: str) -> Dict[str, Any]:
        print(f"[TriageAgent] Received prompt: {user_prompt}")
        
        match = re.search(r'HHG-\d{3}', user_prompt.upper())
        detected_case_id = match.group(0) if match else None

        if self.client:
            sys_prompt = """
You are the cyber-forensics Triage Agent. You MUST return your response as a valid json-render JSON spec.
Return ONLY a JSON object representing the UI spec.
"""
            context = ""
            if detected_case_id:
                case_data = self.get_case_data(detected_case_id)
                context = f"\n\nContext for {detected_case_id}:\n{json.dumps(case_data)}"

            try:
                chat = self.client.chats.create(
                    model=self.model,
                    config={
                        "system_instruction": sys_prompt,
                        "temperature": 0.2,
                        "response_mime_type": "application/json"
                    }
                )
                resp = chat.send_message(user_prompt + context)
                ui_spec = json.loads(resp.text)
                return {
                    "reply": f"Analysis complete for {detected_case_id or 'query'}.",
                    "case_id": detected_case_id,
                    "model_used": "Gemini 3.8 Flash (Vertex AI)",
                    "ui_spec": ui_spec,
                    "quick_actions": ["Simulate Dispute", "Scan Shared Device Rings"]
                }
            except Exception as e:
                print("Failed to call Vertex AI:", e)

        # Check if user directly passed OpenUI Lang DSL (e.g. root = Card([...]))
        if "root =" in user_prompt or "root=" in user_prompt:
            return {
                "reply": "### OpenUI Component Rendered\n\nLive `<Renderer />` output via `@openuidev/react-headless` & `@openuidev/react-lang`:",
                "openui_lang": user_prompt.strip(),
                "case_id": detected_case_id,
                "model_used": "OpenUI Headless Runtime",
                "quick_actions": ["Investigate HHG-001", "List active fraud cases"]
            }

        # Real TigerGraph & Database Analytical Response
        if detected_case_id:
            case_data = self.get_case_data(detected_case_id)
            if "case" in case_data:
                c = case_data["case"]
                sar = case_data.get("sar", {})
                verdict_str = c.get("verdict", "unknown").upper()
                pattern_str = c.get("pattern", "N/A")
                exposure_val = float(c.get("exposure_usd", 0.0))
                prob_pct = round(float(c.get("fraud_probability", 0.0)) * 100, 1)
                cards_str = ", ".join(c.get("connected_card_ids", [])) or "None"
                alert_variant = "destructive" if verdict_str == "FRAUD" else "info"

                openui_lang = f'''root = Card([tags, alertBox, metricsTbl])
tags = TagBlock([Tag("{detected_case_id}", "default"), Tag("{verdict_str}", "{ 'destructive' if verdict_str == 'FRAUD' else 'secondary' }"), Tag("{pattern_str}", "outline")])
alertBox = Alert("Forensic Verdict: {verdict_str}", "Exposure: ${exposure_val:,.2f} · Fraud Probability: {prob_pct}% · Cards: {cards_str}", "{alert_variant}")
metricsTbl = Table([Col("Metric", "string"), Col("Value", "string")], [["Case ID", "{detected_case_id}"], ["Pattern", "{pattern_str}"], ["Exposure (USD)", "${exposure_val:,.2f}"], ["Risk Score", "{prob_pct}%"], ["Connected Cards", "{cards_str}"]])'''

                reply_md = f"""### Forensic Dossier: **{detected_case_id}**

- **Verdict**: `{verdict_str}`
- **Pattern Identified**: `{pattern_str}`
- **Total Financial Exposure**: `${exposure_val:,.2f}`
- **Fraud Probability Score**: `{prob_pct}%`
- **Connected Card(s)**: `{cards_str}`

#### Investigation Summary
{c.get('summary', 'No summary generated.')}

#### FinCEN Regulatory SAR Narrative
> {sar.get('narrative', 'SAR filing not required for this risk profile.')}
"""
                return {
                    "reply": reply_md,
                    "openui_lang": openui_lang,
                    "case_id": detected_case_id,
                    "model_used": "TigerGraph MCP + Policy Engine",
                    "quick_actions": [f"Simulate Customer Denial for {detected_case_id}", f"View Graph Topology for {detected_case_id}"]
                }

        # Chart / Graph / Pie Chart / Visual Analytics Request
        if any(w in user_prompt.lower() for w in ["pie", "chart", "graph", "plot", "visualize", "bar", "line"]):
            all_cases = self.list_all_cases()
            fraud_cnt = sum(1 for c in all_cases if c["verdict"] == "fraud")
            legit_cnt = max(0, len(all_cases) - fraud_cnt)
            top_c = [c for c in all_cases if c["exposure_usd"] > 0][:6] or all_cases[:6]
            c_labels = json.dumps([c["case_id"] for c in top_c])
            c_exp = json.dumps([round(float(c["exposure_usd"]), 2) for c in top_c])
            c_risk = json.dumps([round(float(c["risk_score"]) * 100, 1) for c in top_c])

            openui_lang = f'''root = Card([header, tabs])
header = CardHeader("TigerGraph Forensic Analytics", "Real-time portfolio breakdown across {len(all_cases)} indexed cases")
tabs = Tabs([tabPie, tabBar, tabLine])
tabPie = TabItem("verdict", "Verdict Breakdown (Pie)", [pieChart])
tabBar = TabItem("exposure", "Exposure USD (Bar)", [barChart])
tabLine = TabItem("risk", "Risk Trajectory (Line)", [lineChart])
pieChart = PieChart([Slice("Confirmed Fraud", {fraud_cnt}), Slice("Legitimate / Cleared", {legit_cnt})])
barChart = BarChart({c_labels}, [Series("Exposure ($)", {c_exp})], "grouped", "Case ID", "USD ($)")
lineChart = LineChart({c_labels}, [Series("Risk Score (%)", {c_risk})], "Case ID", "Risk (%)")'''

            return {
                "reply": f"""### Forensic Portfolio Analytics Generated

Interactive **Pie Chart**, **Bar Chart**, and **Risk Trajectory Line Chart** rendered from `{len(all_cases)}` active TigerGraph cases (`{fraud_cnt}` confirmed fraud vs `{legit_cnt}` legitimate).""",
                "openui_lang": openui_lang,
                "case_id": detected_case_id,
                "model_used": "TigerGraph MCP + OpenUI Headless",
                "quick_actions": ["List active fraud cases", "Investigate HHG-014", "Top Exposure Cases"]
            }

        # Query about all cases
        if any(w in user_prompt.lower() for w in ["all", "list", "cases", "alerts", "overview", "top"]):
            all_cases = self.list_all_cases()
            if all_cases:
                total_exposure = sum(c["exposure_usd"] for c in all_cases)
                fraud_count = sum(1 for c in all_cases if c["verdict"] == "fraud")
                top_cases = all_cases[:8]
                chart_labels = json.dumps([c["case_id"] for c in top_cases])
                chart_vals = json.dumps([round(float(c["exposure_usd"]), 2) for c in top_cases])

                openui_lang = f'''root = Card([tags, chart])
tags = TagBlock([Tag("Active Cases: {len(all_cases)}", "default"), Tag("Confirmed Fraud: {fraud_count}", "destructive"), Tag("Exposure: ${total_exposure:,.2f}", "outline")])
chart = BarChart({chart_labels}, [Series("Exposure ($)", {chart_vals})], "grouped", "Case ID", "USD ($)")'''

                rows_md = "\n".join([
                    f"| `{c['case_id']}` | **{c['verdict'].upper()}** | `{c['pattern']}` | {(c['risk_score']*100):.0f}% | ${c['exposure_usd']:,.2f} |"
                    for c in all_cases[:10]
                ])
                
                reply_md = f"""### TigerGraph Benchmark Cases Overview

- **Active Cases Indexed**: `{len(all_cases)}`
- **Confirmed Fraud Cases**: `{fraud_count}`
- **Total Portfolio Exposure**: `${total_exposure:,.2f}`

| Case ID | Verdict | Pattern | Risk Score | Exposure |
|---|---|---|---|---|
{rows_md}

*(Showing top 10 of {len(all_cases)} cases. Ask for any specific case, e.g. `Investigate HHG-010`)*
"""
                return {
                    "reply": reply_md,
                    "openui_lang": openui_lang,
                    "case_id": None,
                    "model_used": "TigerGraph MCP Engine",
                    "quick_actions": ["Investigate HHG-010", "Investigate HHG-001", "Show High Exposure Cases"]
                }

        # General inquiry
        return {
            "reply": f"""### MayDay Forensic Intelligence Ready

Connected to **TigerGraph Knowledge Graph** and **Deterministic Rule Engine (R1–R10)**.

You can ask me to:
1. **Analyze a specific case**: e.g., `Investigate HHG-014` or `Show dossier for HHG-002`
2. **List all cases & financial exposure**: e.g., `List active fraud alerts`
3. **Inspect graph topology**: e.g., `Find shared card & device rings for HHG-010`
4. **Simulate customer evidence**: e.g., `Simulate customer dispute for HHG-003`
""",
            "case_id": None,
            "model_used": "TigerGraph MCP Engine",
            "quick_actions": ["List active fraud cases", "Investigate HHG-014", "Top Exposure Cases"]
        }
