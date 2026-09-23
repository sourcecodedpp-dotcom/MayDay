# Building an Autonomous Fraud Investigation Agent with TigerGraph, GraphRAG, and Policy-Controlled Autonomy
### Hacker House Goa 2026 (HHGOA) — TigerGraph Agentic Fraud Investigation

*By Team Lead & Engineers at HHGOA 2026*  
*Tag: @TigerGraphDB*

---

## 1. Executive Summary & Problem Overview

In modern financial institutions, fraud detection models generate thousands of risk alerts every day. Yet, fraud teams remain bottlenecked: analysts must manually reconstruct transaction history, trace money movement across connected accounts, cross-reference historical case dossiers, check regulatory policies, assess uncertainty, and decide whether to block cards, freeze accounts, or file a Suspicious Activity Report (SAR).

This manual process is slow, fragmented, and often concludes only after the funds have already left the institution.

For **Hacker House Goa 2026**, we built **TigerGraph Agentic Fraud Investigator**: an autonomous, policy-controlled AI agent powered by **TigerGraph**, **GSQL**, **TigerGraph MCP**, and **GraphRAG**. 

Our agent doesn't simply classify transactions. It:
1. Explores graph neighborhoods to uncover multi-hop fraud syndicates and device-sharing rings.
2. Formulates an **interim Next-Best Action (Pre-Evidence)** when signals are uncertain.
3. Requests policy-approved evidence (e.g. step-up authentication, cardholder verification).
4. Reassesses risk dynamically to recommend a **final Next-Best Action (Post-Evidence)** with deterministic human approval routing (`auto`, `L1`, `L2`).
5. Persists the closed case into TigerGraph as **case memory** so future investigations learn immediately.
6. Automatically drafts complete **FinCEN-compliant Suspicious Activity Reports (SAR)** whenever regulatory thresholds are met.

---

## 2. System Architecture

The core architecture separates reasoning from policy enforcement: **The LLM reasons, TigerGraph provides evidence, and the deterministic policy engine enforces what the agent is allowed to do.**

```text
                 ┌──────────────────────┐
                 │   CASE TRIGGER       │
                 │ risk / report / lead │
                 └──────────┬───────────┘
                            ↓
                 ┌──────────────────────┐
                 │ INVESTIGATOR AGENT   │
                 │ Planner + State      │
                 └──────────┬───────────┘
                            ↓
              ┌─────────────┴─────────────┐
              ↓                           ↓
       TigerGraph MCP               Policy Engine
              ↓                           ↓
        GSQL / Graph                 Allowed Actions
        Algorithms                   Permissions
              ↓                           ↓
           GraphRAG ←────────────── Evidence Context
              │
              ↓
        ┌───────────────┐
        │ LLM Reasoner  │
        └───────┬───────┘
                ↓
       Is evidence sufficient?
          /             \
        NO               YES
        ↓                 ↓
 Evidence Request     Next Best Action
        ↓                 ↓
 New Evidence       Approval Routing
        ↓                 ↓
        └──────→ Reassess ←─┘
                     ↓
              Case Writeback
                     ↓
              Case Memory (FraudGraph)
                     ↓
          ┌──────────┴──────────┐
          ↓                     ↓
    JSON Benchmark          Analyst UI
   (20 Exam Cases)      (Interactive Subgraph)
```

---

## 3. How TigerGraph Powers the Solution

### A. Graph Schema Design (`FraudGraph`)
Our graph schema links transactions, entities, and historical cases into a unified knowledge graph:
- **Vertices**: `Customer`, `Card`, `Transaction`, `DeviceProfile`, `BillingRegion`, `ClosedCase`, `FraudCase`.
- **Edges**:
  - `Customer` → `OWNS` → `Card`
  - `Card` → `MADE` → `Transaction`
  - `Transaction` → `FROM_DEVICE` → `DeviceProfile`
  - `Transaction` → `BILLED_IN` → `BillingRegion`
  - `ClosedCase` → `INVOLVES` → `Transaction`
  - `FraudCase` → `CASE_ON_CARD` → `Card`

### B. High-Performance GSQL Queries
We implemented four specialized GSQL queries to execute multi-hop graph traversals:

1. **Card Velocity & Testing Detection (`detect_card_testing`)**:
   Detects micro-authorization attacks (3+ transactions under \$10 within 60 minutes followed by larger purchases), triggering Policy Rule R5.
2. **Shared Device Ring Detection (`find_shared_device_rings`)**:
   Traverses `Transaction → DeviceProfile → Transaction → Card` to discover when a single device fingerprint or proxy is shared across distinct cardholders (Policy Rule R6).
3. **Billing Region Continuity (`check_region_history`)**:
   Distinguishes between a legitimate customer on a travel corridor (multiple past purchases in that region) vs. a counterfeit cloned card used out-of-region (Policy Rule R2/R4).
4. **Case Memory Retrieval (`retrieve_similar_cases`)**:
   Retrieves past investigations from 5,565 closed cases to ground the agent in prior analyst findings.

### C. TigerGraph MCP (Model Context Protocol)
To ensure the agent genuinely operates TigerGraph as a toolset, we exposed graph queries as structured, auditable MCP tools:
- `tg_get_card_history`
- `tg_detect_card_testing`
- `tg_find_shared_device_rings`
- `tg_check_region_history`
- `tg_retrieve_similar_cases`
- `tg_write_case_to_graph`

Each tool invocation produces an auditable telemetry record capturing arguments, response summaries, execution latency, and case IDs.

---

## 4. The Investigation & Uncertainty Loop: A Deep Dive

A major requirement of the brief is that **the agent must not blindly block on weak signals**, and must know when to gather additional evidence before finalizing its decision.

### Case Walkthrough 1: Legitimate Cardholder Traveling (`HHG-001`)
- **Trigger**: The real-time ML model scored transaction 3514030 (\$77.07, in billing region 444.0) at `0.61`.
- **Graph Traversal**: The agent queried `check_region_history`. It discovered that cardholder `C12382` already has 15 historical transactions in billing region 444.0!
- **Initial NBA (Pre-Evidence)**:
  - `VERIFY_WITH_CUSTOMER` (route: `auto`, reason: Rule R1: weak signal, probability < 0.70).
  - `MONITOR_CARD` (route: `auto`).
- **Evidence Resolution**: Customer confirms personal travel to billing region 444.0.
- **Final NBA (Post-Evidence)**:
  - `CLOSE_NO_FRAUD` (route: `auto`, reason: Rule R3: customer confirmed transaction as legitimate).
- **Outcome**: Verdict `legitimate`, exposure \$0.00, no false-positive block.

### Case Walkthrough 2: The Undocumented Proxy Syndicate (`HHG-014`)
- **Trigger**: Analyst request flagging transaction 3478561 on card `C13487-K1`.
- **Graph Traversal**: `find_shared_device_rings` discovered the device profile:
  `SM-G935F Build/NRD90M | Android 7.0 | chrome 62.0 for android | 1920x1080`
  operating behind an anonymous proxy, directly linked to two other cards (`C11923-K2`, `C13171-K2`) and matching closed cases `CC-2649` and `CC-2971`!
- **Initial & Final NBA**:
  - `BLOCK_CARD` (route: `L1`).
  - `CREATE_CASE` (route: `auto`).
  - `FILE_REPORT` (route: `L2`, reason: R6/R9 shared syndicate across cards).
  - `MONITOR_CONNECTED_CARDS` (route: `auto`).
- **SAR Generation**: FinCEN SAR narrative drafted with full subject enumeration (`C13487`, `C13487-K1`, `C11923-K2`, `C13171-K2`).

---

## 5. Evaluation & Results on the 20 Benchmark Cases

We evaluated the agent across all 20 benchmark test cases in `case_pack.csv`:
- **Accuracy & Coverage**: 100% of benchmark cases evaluated.
- **Balanced Triage**: 14 confirmed fraud cases, 6 legitimate cleared cases.
- **Compliance**: 100% validation against the official hackathon schema rules via automated validator.
- **Speed**: Batch evaluation of all 20 cases completes in **0.26 seconds**.

---

## 6. What We Learned & Future Improvements

1. **Graph Topology Prevents Hallucination**: Tabular ML models look at transactions in isolation; knowledge graphs provide the critical connective tissue that reveals coordinated syndicates.
2. **Deterministic Guardrails are Mandatory in Banking**: Allowing an LLM to freely invent block actions is unacceptable in production financial systems. The dual structure of **LLM Reasoner + Deterministic Policy Engine** is the right paradigm.
3. **Future Improvements with More Time**:
   - Integrating real-time graph embeddings using TigerGraph ML Workbench.
   - Live webhooks to streaming payment rails (e.g. FedNow / SEPA Instant).
   - Automated graph community detection (Louvain algorithm) running continuously over transaction streams to preemptively cluster mule rings.

---

*Built with passion for Hacker House Goa 2026. Powered by TigerGraph.*
