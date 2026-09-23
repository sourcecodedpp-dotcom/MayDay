# TigerGraph Agentic Fraud Investigation Cockpit (HHGOA 2026)

> An Agentic Fraud Investigation System with Policy-Controlled Autonomy, powered by TigerGraph, GSQL, TigerGraph MCP, and GraphRAG for Hacker House Goa 2026.

[![Validation](https://img.shields.io/badge/Evaluator%20Schema-100%25%20PASS-brightgreen.svg)]()
[![Benchmark](https://img.shields.io/badge/20%20Cases-Complete-blue.svg)]()
[![TigerGraph](https://img.shields.io/badge/TigerGraph-Savanna%20Compatible-orange.svg)]()

---

## Overview

In response to the **Hacker House Goa 2026** challenge, this system automates end-to-end financial fraud investigations. Rather than acting as a simple classifier, the agent:
- Gathers multi-hop graph evidence using **TigerGraph GSQL** and **TigerGraph MCP**.
- Employs **GraphRAG** over historical case memory (5,565 closed cases) and bank typologies.
- Quantifies uncertainty to formulate an interim **Initial Next-Best Action (Pre-Evidence)**.
- Executes policy-approved evidence inquiries (e.g. step-up authentication, cardholder verification).
- Dynamically reassesses risk to issue a **Final Next-Best Action (Post-Evidence)** with deterministic human approval routing (`auto`, `L1`, `L2`).
- Writes investigated cases back to the graph as active case memory.
- Generates FinCEN-compliant **Suspicious Activity Reports (SAR)** when required by policy.

---

## Repository Structure

```text
├── cases/                     # The 20 benchmark answer JSON files (HHG-001 to HHG-020)
├── data/                      # Dataset files (case pack, closed cases, transactions, identity)
├── engine/
│   ├── investigator.py        # Core cognitive investigation agent loop
│   ├── policy_engine.py       # Deterministic Bank Fraud Policy Engine (Rules R1 to R10)
│   └── sar_generator.py       # Regulatory SAR narrative generator (Section 3a)
├── tigergraph/
│   ├── schema.gsql            # Graph schema DDL (Vertices & Edges)
│   ├── queries.gsql           # GSQL queries (rings, testing, region history, case memory)
│   ├── tg_store.py            # TigerGraph store and Savanna connector
│   └── mcp_tools.py           # TigerGraph MCP tool provider with auditable telemetry
├── server/
│   └── app.py                 # FastAPI backend server
├── frontend/
│   └── dist/index.html        # Interactive cyber-forensics analyst terminal (Cytoscape graph)
├── scripts/
│   ├── run_benchmarks.py      # Batch benchmark runner for all 20 cases
│   ├── validate_answers.py    # Strict official schema validator
│   └── test_single_case.py    # End-to-end single case test script
├── BLOG_POST.md               # Technical blog post for submission
└── SUBMISSION.md              # Submission guide, checklist, and social media copy
```

---

## Quickstart

### 1. Setup Environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Run the 20 Benchmark Cases
To regenerate and validate the 20 official submission answer files in `cases/*.json`:
```bash
PYTHONPATH=. python scripts/run_benchmarks.py
```

### 3. Validate Answer Files
To test the generated JSON files against every rule in the official evaluator:
```bash
PYTHONPATH=. python scripts/validate_answers.py
```

### 4. Launch the Analyst Cockpit UI
Start the backend server and open the interactive dashboard:
```bash
PYTHONPATH=. uvicorn server.app:app --host 0.0.0.0 --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## Connecting to TigerGraph Savanna

To connect directly to your live TigerGraph Savanna cloud instance:
1. Create a workspace at [https://savanna.tgcloud.io](https://savanna.tgcloud.io).
2. Set your environment variables in `.env`:
```bash
TIGERGRAPH_HOST=https://your-workspace.i.tgcloud.io
TIGERGRAPH_USERNAME=tigergraph
TIGERGRAPH_PASSWORD=your_password
TIGERGRAPH_GRAPH=FraudGraph
```
3. Load the schema and queries:
```bash
pyTigerGraph gsql tigergraph/schema.gsql
pyTigerGraph gsql tigergraph/queries.gsql
```

---

## Submission Deliverables

- **Answer Files**: `cases/HHG-001.json` through `cases/HHG-020.json`.
- **Technical Blog Post**: [`BLOG_POST.md`](BLOG_POST.md).
- **Submission Portal & Video Script**: [`SUBMISSION.md`](SUBMISSION.md).
