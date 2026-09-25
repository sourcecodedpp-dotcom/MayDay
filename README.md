# MayDay // Agentic Fraud Investigation Cockpit (HHGOA 2026)

> An Autonomous, Policy-Governed Financial Fraud Investigation System powered by **TigerGraph Savanna**, **TigerGraph MCP**, **Gemini 3.8 Flash**, **Lekh DSL v1**, and **Headless OpenUI GenUI** for Hacker House Goa 2026.

[![Evaluator Schema](https://img.shields.io/badge/Official%20Schema%20Validator-100%25%20PASS-brightgreen.svg)]()
[![Benchmark Cases](https://img.shields.io/badge/20%20Exam%20Cases-Complete%20%26%20Calibrated-blue.svg)]()
[![TigerGraph](https://img.shields.io/badge/TigerGraph-Savanna%20Cloud%20Ready-orange.svg)]()
[![Reasoning](https://img.shields.io/badge/Engine-Gemini%203.8%20Flash%20(Thinking%20Tokens)-violet.svg)]()

---

## 1. System Overview & The 5-Stage Investigation Funnel

Rather than acting as a simple binary classifier, MayDay executes a comprehensive 5-stage autonomous forensic investigation funnel governed by bank policy:

```text
═════════════════════════════════════════════════════════════════════════════════
                       MAYDAY INVESTIGATION FUNNEL
═════════════════════════════════════════════════════════════════════════════════

[STAGE 1]  ALERT TRIAGE & INGESTION
           • 590k IEEE-CIS transactions ingested via live CSV drag-and-drop or TigerGraph
           • Detection model risk score flags transactions (risk > 0.70 or customer report)
           ▼
[STAGE 2]  GRAPH EXPLORATION & GRAPHRAG (TigerGraph MCP)
           • Multi-hop GSQL graph traversals (Card → DeviceProfile → Connected Cards)
           • Micro-authorization card testing velocity check (detect_card_testing)
           • Shared proxy and hardware ring detection (find_shared_device_rings)
           • Precedent retrieval across 5,565 closed historical cases in graph memory
           ▼
[STAGE 3]  UNCERTAINTY & INITIAL NEXT-BEST ACTION (Pre-Evidence)
           • Evaluates single vs. multi-signal confidence
           • Policy R1 Guardrail: If probability < 0.70 on weak signal, initiates
             VERIFY_WITH_CUSTOMER or STEP_UP_AUTH (never blocks prematurely)
           ▼
[STAGE 4]  CONTROLLED EVIDENCE RESOLUTION
           • Inquiries executed without human intervention (customer / analyst simulation)
           • Evidence recorded with claim, source (graph|customer|document), ref & entity IDs
           ▼
[STAGE 5]  REASSESSMENT, TIERED APPROVAL & REGULATORY SAR
           • Risk dynamically recalibrated (probabilities updated to >= 0.85 or <= 0.15)
           • Strict deterministic approval routes:
             - auto: Automated actions (case creation, customer alerts)
             - L1: Team Lead approval (BLOCK_CARD <= $2,500, DECLINE_TRANSACTION)
             - L2: Fraud Manager approval (BLOCK_CARD > $2,500, FILE_REPORT, BLOCK_ALL_CARDS)
           • TigerGraph Graph Memory Writeback (persist_fraud_case)
           • Automatic drafting of FinCEN Suspicious Activity Reports (SAR)
═════════════════════════════════════════════════════════════════════════════════
```

---

## 2. Key Architectural Innovations

### A. TigerGraph Savanna & GSQL Layer
- **Graph Schema (`FraudGraph`)**: Rich multi-entity graph defined in [`backend/tigergraph/schema.gsql`](backend/tigergraph/schema.gsql) linking `Customer`, `Card`, `Transaction`, `DeviceProfile`, `BillingRegion`, and `ClosedCase`.
- **GSQL Graph Algorithms**: Production queries in [`backend/tigergraph/queries.gsql`](backend/tigergraph/queries.gsql) detecting card velocity, device-sharing mule rings, and regional travel corridors.
- **TigerGraph MCP**: Standardized Model Context Protocol interface in [`backend/tigergraph/mcp_tools.py`](backend/tigergraph/mcp_tools.py) with structured telemetry and execution logging.

### B. Gemini 3.8 Flash with Active Thinking Tokens
- Backed by Google Cloud Vertex AI global endpoint with multi-step tool calling loop (`stopWhen: stepCountIs(5)`).
- Real-time reasoning steps and thinking tokens surfaced directly in the cockpit header badge and expandable in-chat accordions.

### C. Lekh DSL v1: Unified Agentic Specification Language
MayDay uses **Lekh**, a lightweight bracket-only syntax (`[CONTEXT]`, `[CASE]`, `[NODE]`, `[EDGE]`, `[REVIEW]`, `[REPORT]`), for context injection, graph topology serialization, and regulatory filing without model hallucinations.

### D. Headless OpenUI Cockpit + shadcn/ui
- Real-time generative UI rendering interactive cards, topology subgraphs, data tables with horizontal scrolling, and dynamic follow-up actions.
- Powered by `@openuidev/react-headless` and `@openuidev/react-lang`.

---

## 3. Repository Structure

```text
├── backend/                       # Python FastAPI Backend
│   ├── app.py                     # API server, upload endpoints & redirects
│   ├── engine/                    # Forensic reasoning engines
│   │   ├── investigator.py        # Autonomous cognitive agent loop
│   │   ├── policy_engine.py       # Deterministic bank rules (R1 to R10)
│   │   ├── lekh_dsl.py            # Lekh DSL v1 engine
│   │   ├── sar_generator.py       # FinCEN SAR narrative drafting
│   │   └── triage_agent.py        # Real-time portfolio analytics & chat router
│   ├── tigergraph/                # TigerGraph Layer
│   │   ├── schema.gsql            # Graph schema DDL
│   │   ├── queries.gsql           # GSQL graph queries
│   │   ├── tg_store.py            # TigerGraph connector (Savanna + local fallback)
│   │   └── mcp_tools.py           # TigerGraph MCP server & telemetry
│   └── ingest_csv.py              # CSV ingestion & dynamic case_pack extraction
│
├── cases/                         # 20 Benchmark evaluation answer files (HHG-001 to HHG-020)
├── data/                          # Shared data schemas, case pack & SQLite cache
├── scripts/                       # Benchmark runners & official validator
│   ├── run_benchmarks.py          # 20-case batch runner
│   └── validate_answers.py        # Official schema validator (100% PASS)
│
├── real-shadcn-app/               # Modern Next.js Generative UI Cockpit
│   ├── src/app/page.tsx           # Headless OpenUI analyst cockpit
│   ├── src/app/api/chat/route.ts  # Vertex AI Gemini 3.8 Flash agent route
│   └── src/lib/shadcn-genui/      # shadcn OpenUI Lang component library
│
├── .env.example                   # Safe environment template
├── BLOG_POST.md                   # Technical blog post
└── SUBMISSION.md                  # Hackathon submission checklist
```

---

## 4. Quickstart Guide

### Step 1: Environment Setup
```bash
# Clone the repository
git clone https://github.com/sourcecodedpp-dotcom/MayDay.git
cd MayDay

# Set up Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set up frontend dependencies
cd real-shadcn-app && pnpm install && cd ..
```

### Step 2: Validate the 20 Benchmark Cases
To test all 20 answer files against the official hackathon evaluation rules:
```bash
python3 scripts/validate_answers.py
```
*(All 20 cases pass 100% of schema and consistency checks).*

### Step 3: Launch the MayDay Cockpit

**Terminal 1 — Backend (FastAPI + TigerGraph MCP):**
```bash
source venv/bin/activate
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend (Next.js Headless Cockpit):**
```bash
npm run dev
# or: cd real-shadcn-app && pnpm run dev --port 3001
```

Open **[http://localhost:3001](http://localhost:3001)** in your browser. (Visiting `http://localhost:8000` will automatically redirect to port 3001).

---

## 5. Connecting to Live TigerGraph Savanna Cloud

To run against your live cloud cluster:
1. Create a workspace at [https://savanna.tgcloud.io](https://savanna.tgcloud.io).
2. Copy `.env.example` to `.env` and fill in your Savanna credentials:
   ```bash
   TIGERGRAPH_HOST=https://your-workspace.i.tgcloud.io
   TIGERGRAPH_USERNAME=tigergraph
   TIGERGRAPH_PASSWORD=your_password
   TIGERGRAPH_GRAPH=FraudGraph
   ```
3. Deploy the schema and GSQL queries:
   ```bash
   pyTigerGraph gsql backend/tigergraph/schema.gsql
   pyTigerGraph gsql backend/tigergraph/queries.gsql
   ```

---

## 6. Official Hackathon Evaluation Results

| Metric | Result | Notes |
| :--- | :--- | :--- |
| **Total Benchmark Cases** | **20 / 20** | All cases evaluated (`HHG-001` through `HHG-020`) |
| **Confirmed Fraud Syndicates** | **14 cases** | Cards blocked, regulatory SARs drafted |
| **Legitimate Cardholders Cleared** | **6 cases** | Zero false-positive account freezes |
| **Evaluator Schema Compliance** | **100% PASS** | Zero validation errors on `scripts/validate_answers.py` |
| **Graph Query Latency** | **< 15ms** | Sub-millisecond local graph operations |
| **Batch Benchmark Speed** | **0.26 seconds** | Fast batch execution |

---

*Built with passion for Hacker House Goa 2026. Powered by TigerGraph Savanna, Gemini 3.8 Flash, and OpenUI.*
