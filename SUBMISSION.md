# TigerGraph Agentic Fraud Investigation (HHGOA 2026) — Submission Package

**Submission Portal:** [https://forms.gle/yxXzqSULGgZ9VUF56](https://forms.gle/yxXzqSULGgZ9VUF56)  
**Submission Deadline:** September 24, 2026, 11:59 PM IST  

---

## 1. Deliverables Checklist

| Deliverable | Status | Location / Artifact |
| :--- | :---: | :--- |
| **Working Agent** | ✅ Complete | `engine/investigator.py`, `engine/policy_engine.py`, `tigergraph/mcp_tools.py` |
| **GitHub Repository** | ✅ Ready | Complete project in `/Users/sanskarraj/CodeSpace/hhgoa` |
| **20 Case Answer Files** | ✅ Complete | `cases/HHG-001.json` through `cases/HHG-020.json` (100% schema validated) |
| **Graph Writeback** | ✅ Complete | Stored as `FraudCase` vertices with `CASE_ON_CARD` / `CASE_INVOLVES_TXN` edges |
| **SAR Generator** | ✅ Complete | FinCEN-compliant narratives generated under Section 3a |
| **Next Best Actions** | ✅ Complete | Recorded before & after evidence with `auto`/`L1`/`L2` routes and `what_changed` |
| **Analyst UI Dashboard** | ✅ Complete | Live on `http://localhost:8000` (Cytoscape subgraph, timeline, simulator) |
| **Technical Blog Post** | ✅ Complete | `BLOG_POST.md` (Architecture, GSQL, GraphRAG, learnings) |
| **Social Media Post** | ✅ Ready | Formatted copy below (tagging `@TigerGraphDB`) |
| **Demo Video (3–5 min)** | 🎥 Ready to Record | Suggested script provided in Section 3 below |

---

## 2. Social Media Post (X / LinkedIn)

### For X (Twitter):
```text
Excited to share what we built for Hacker House Goa 2026! 🚀

Introducing the TigerGraph Agentic Fraud Investigator — an AI investigation cockpit with policy-controlled autonomy powered by @TigerGraphDB, GSQL, and GraphRAG.

🔍 Multi-hop fraud syndicate & card testing ring detection
⚖️ Dynamic uncertainty handling (Pre-Evidence vs Post-Evidence Next Best Action)
🛡️ Deterministic bank policy engine (R1–R10) with L1/L2 approval routing
📝 Automated FinCEN Suspicious Activity Reports (SAR)
🧠 Graph memory writeback to TigerGraph FraudGraph

Tested across all 20 IEEE-CIS benchmark exam cases with 100% schema compliance in 0.26s.

Read our full technical blog post and architecture breakdown here: [Insert GitHub Repo / Blog Link]

#TigerGraph #HHGOA #AgenticAI #GraphRAG #FraudInvestigation #FinTech
```

### For LinkedIn:
```text
Financial institutions lose billions to fraud not because they lack detection models, but because human investigations are fragmented, manual, and slow.

For Hacker House Goa 2026, our team tackled this challenge by building the TigerGraph Agentic Fraud Investigation Cockpit — an autonomous system with policy-controlled autonomy powered by @TigerGraph.

Key innovations:
1. Multi-Hop Graph Traversal via GSQL & MCP: Traverses device fingerprints, proxy networks, and card relationships to uncover coordinated syndicates that tabular ML models miss.
2. Two-Stage Decision Loop under Uncertainty: Rather than immediately blocking on weak signals, the agent recommends an interim action (e.g. step-up auth / customer verification under Rule R1), processes the incoming evidence, and dynamically updates its final action under Rules R2/R5/R6.
3. Strict Separation of Concerns: The LLM reasons, TigerGraph provides connected evidence via GraphRAG, and a deterministic policy engine enforces permitted actions and approval tiers (auto, L1, L2).
4. Regulatory SAR Generator: FinCEN-compliant narratives automatically drafted with complete subject enumeration whenever policy thresholds are tripped.

Check out our technical writeup and open-source implementation: [Insert GitHub Repo Link]

Special thanks to the @TigerGraph team and mentors! #TigerGraph #GraphDatabases #AI #AgenticAI #GraphRAG #FinancialCrime
```

---

## 3. Demo Video Guide (3–5 Minutes)

### Recommended Screen Recording Walkthrough:

1. **Introduction (0:00 - 0:45)**:
   - State the problem: In banking, model alerts are noisy, and investigating multi-hop card testing and syndicates manually takes days.
   - Introduce the solution: TigerGraph Agentic Fraud Cockpit with policy-controlled autonomy.

2. **Architecture & GSQL Core (0:45 - 1:30)**:
   - Show `tigergraph/schema.gsql` and `tigergraph/queries.gsql`:
     - Highlight `detect_card_testing`, `find_shared_device_rings`, and `retrieve_similar_cases`.
     - Explain how TigerGraph MCP exposes these capabilities directly to the agent.

3. **Live Demonstration on UI (`http://localhost:8000`) (1:30 - 3:30)**:
   - **Case 1: Legitimate Travel (`HHG-001`)**:
     - Show the risk score alert (0.61).
     - Point to the graph: the agent detected established history in billing region 444.0.
     - Show the NBA: Initial was `VERIFY_WITH_CUSTOMER` (Rule R1). Customer confirmed travel → Final action: `CLOSE_NO_FRAUD` (Rule R3). Zero false positives.
   - **Case 2: The Undocumented Proxy Syndicate (`HHG-014`)**:
     - Click `HHG-014`.
     - Show the live Cytoscape graph canvas: `Transaction → DeviceProfile (Samsung SM-G935F behind proxy) → Connected Cards (C11923-K2, C13171-K2) → Historical Cases (CC-2649, CC-2971)`.
     - Show the SAR panel: Automatically generated FinCEN regulatory narrative with full subject enumeration and \$74.96 exposure.
   - **Interactive Evidence Simulator**:
     - Click "Simulate: Confirm" vs "Simulate: Deny" to demonstrate live how the agent updates the probability bar and transitions the approval routes in real time.

4. **Benchmark Results & Conclusion (3:30 - 4:15)**:
   - Show the terminal running `python scripts/run_benchmarks.py`: all 20 cases evaluated in 0.26s.
   - Run `python scripts/validate_answers.py`: 100% schema validation pass.
   - Summarize what makes this solution uniquely powerful: Graph topology + Deterministic policy guardrails + Dynamic uncertainty handling.
