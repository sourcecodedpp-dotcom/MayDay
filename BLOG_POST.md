# Building MayDay: Autonomous Agentic Fraud Cockpit with TigerGraph, Gemini 3.8 Flash, and Lekh DSL
### Hacker House Goa 2026 (HHGOA) — TigerGraph Agentic Fraud Investigation

*By the MayDay Team | Hacker House Goa 2026*  
*GitHub: [https://github.com/sourcecodedpp-dotcom/MayDay](https://github.com/sourcecodedpp-dotcom/MayDay)*  
*Tags: #tigergraph #ai #frauddetection #gemini #nextjs*

---

## 1. Executive Summary & Problem Overview

In modern banking, fraud detection systems trigger thousands of risk alerts daily. Yet fraud triage teams face an operational bottleneck: analysts must manually reconstruct transaction history across accounts, correlate device fingerprints, cross-reference historical case dossiers, check policy rules, draft FinCEN Suspicious Activity Reports (SAR), and determine whether to freeze accounts.

This manual process is fragmented and slow. By the time a decision is made, funds have often already left the institution.

For **Hacker House Goa 2026**, we engineered **MayDay**: an autonomous, policy-controlled fraud intelligence cockpit powered by:
- **TigerGraph & GSQL**: Multi-hop graph traversals for entity resolution, card-testing detection, and syndicate tracking.
- **TigerGraph MCP (Model Context Protocol)**: Standardized, auditable graph query tools callable directly by autonomous reasoning agents.
- **Gemini 3.8 Flash (Vertex AI)**: Deep reasoning engine with active thinking tokens and multi-step tool orchestration.
- **Lekh DSL v1**: A unified bracket-only specification language (`[CONTEXT]`, `[CASE]`, `[NODE]`, `[EDGE]`, `[REVIEW]`, `[REPORT]`) for agentic context management and regulatory audit trails.
- **Headless OpenUI + shadcn/ui**: Real-time generative UI rendering interactive cockpits, live telemetry, and graph subgraphs.

---

## 2. End-to-End System Architecture

```text
 ┌────────────────────────────────────────────────────────┐
 │                   MayDay Analyst Cockpit               │
 │            (Headless OpenUI Lang + shadcn/ui)          │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            │ Streaming SSE / OpenUI Lang
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │              Gemini 3.8 Flash (Vertex AI)              │
 │         Reasoning Engine · Thinking Tokens             │
 └──────────────────────────┬─────────────────────────────┘
                            │
          Multi-Step Tool Orchestration (AI SDK v7)
                            │
    ┌───────────────────────┴───────────────────────┐
    ▼                                               ▼
┌─────────────────────────┐               ┌───────────────────┐
│     TigerGraph MCP      │               │    Lekh DSL v1    │
│  - tg_get_card_history  │               │ [CONTEXT] [CASE]  │
│  - tg_detect_testing    │               │ [NODE] [EDGE]     │
│  - tg_find_device_rings │               │ [REVIEW] [REPORT] │
│  - tg_check_region      │               └───────────────────┘
│  - tg_write_case_memory │
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  TigerGraph FraudGraph  │
│  - Customers & Cards    │
│  - Transactions         │
│  - Device Profiles      │
│  - 5,565 Historical SAR │
└─────────────────────────┘
```

---

## 3. How TigerGraph Powers MayDay

### A. Graph Schema Design (`FraudGraph`)
Relational databases collapse when traversing 3+ hops of connected entities. Our TigerGraph schema links transactions, devices, and historical cases into a unified graph:
- **Vertices**: `Customer`, `Card`, `Transaction`, `DeviceProfile`, `BillingRegion`, `ClosedCase`, `FraudCase`.
- **Edges**:
  - `Customer` → `OWNS` → `Card`
  - `Card` → `MADE` → `Transaction`
  - `Transaction` → `FROM_DEVICE` → `DeviceProfile`
  - `Transaction` → `BILLED_IN` → `BillingRegion`
  - `ClosedCase` → `INVOLVES` → `Transaction`
  - `FraudCase` → `CASE_ON_CARD` → `Card`

### B. High-Performance GSQL Queries
1. **Card Velocity & Testing Detection (`detect_card_testing`)**:
   Detects micro-authorization attacks (3+ transactions under $15 within 60 minutes followed by larger purchases), triggering isolation protocols.
2. **Shared Device Ring Detection (`find_shared_device_rings`)**:
   Traverses `Transaction → DeviceProfile → Transaction → Card` to expose anonymous proxies and hardware fingerprints shared across distinct customer accounts.
3. **Billing Region Continuity (`check_region_history`)**:
   Differentiates between a legitimate cardholder on a travel corridor vs. a counterfeit cloned card used out-of-region.
4. **Historical Case Memory Retrieval (`retrieve_similar_cases`)**:
   Matches incoming fraud patterns against 5,565 closed case graphs to ground decisions in historical bank precedent.

### C. TigerGraph MCP (Model Context Protocol)
All graph queries are exposed as auditable MCP tools:
- `list_tigergraph_cases`
- `get_tigergraph_dossier`
- `get_case_in_lekh`
- `get_tigergraph_subgraph`
- `simulate_analyst_action`

Every call generates an immutable telemetry record logging execution latency, query parameters, and graph node coverage.

---

## 4. Lekh DSL v1: Unified Agentic Specification Language

To prevent LLM hallucination and ensure deterministic auditability, MayDay uses **Lekh DSL**: a lightweight, bracket-only syntax:

```
[CONTEXT session=live-alpha model=gemini-3.8-flash cache=ENABLED focus=HHG-010]

[CASE HHG-010 verdict=fraud risk=0.88 exposure=1000.03 pattern=card_not_present_new_device card=C02354-K2 subject=C10434 txn=3506725]

[NODE CUSTOMER id=C10434 label="Customer"]
[NODE CARD id=C02354-K2 label="Card"]
[EDGE C10434 -> C02354-K2 label=OWNS]

[REVIEW rule=RULE_CARD_NOT_PRESENT_NEW_DEVICE trigger="velocity>=3_AND_amount<15" action=ISOLATE_CARD_DRAFT_SAR status=CONFIRMED_FRAUD]

[REPORT HHG-010 subject=C10434 verdict=FRAUD sar=TRUE narrative="Rapid CNP transactions detected on newly attached device fingerprint."]
```

Lekh DSL unifies:
1. **Context Management**: Injected into the model's system prompt.
2. **Case Dossiers**: Serialized graph state.
3. **Logic Review**: Transparent rule execution and policy validation.
4. **Regulatory Reporting**: FinCEN SAR drafts with subject enumeration.

---

## 5. Benchmark Results Across 20 Exam Cases

We tested MayDay against all 20 official benchmark test cases (`HHG-001` through `HHG-020`):

| Metric | Result |
| :--- | :--- |
| **Total Benchmark Cases** | **20 / 20** |
| **Confirmed Fraud Syndicates** | **14 cases** (isolated, SAR drafted, cards blocked) |
| **Legitimate Cardholders Cleared** | **6 cases** (0 false-positive blocks) |
| **Official Evaluator Schema** | **100% PASS** (all validation rules satisfied) |
| **Graph Query Latency** | **< 15ms** average per traversal |
| **Batch Evaluation Speed** | **0.26 seconds** for 20 complex cases |

---

## 6. Key Takeaways & What's Next

1. **Graph Topology Defeats Sybil Syndicates**: Tabular ML models analyze transactions in isolation. TigerGraph's graph traversals reveal the hidden infrastructure connecting mule accounts.
2. **Deterministic Guardrails are Non-Negotiable**: In financial compliance, autonomous agents must adhere to strict policy engines. The combination of **Gemini 3.8 Flash (Reasoning) + TigerGraph (Evidence) + Lekh DSL (Specification)** provides both intelligence and auditability.
3. **What's Next**:
   - Real-time graph neural network (GNN) embeddings via TigerGraph ML Workbench.
   - Live streaming transaction ingestion over FedNow / SEPA rails.
   - Multi-agent collaborative dispute resolution.

---

*Built with passion for Hacker House Goa 2026. Powered by TigerGraph, Gemini 3.8 Flash, and OpenUI.*
