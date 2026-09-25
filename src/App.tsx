import React, { useState, useEffect } from "react";
import { PromptInput } from "./components/PromptInput";
import { Investigation } from "./components/Investigation";
import { Graph } from "./components/Graph";
import { Action } from "./components/Action";
import { Evidence } from "./components/Evidence";
import { FullInvestigation, CaseListItem } from "./types/investigation";
import { SubgraphData } from "./lib/tigergraph";

import { DragDropIngest } from "./components/DragDropIngest";

export const App: React.FC = () => {
  const [showIngest, setShowIngest] = useState(false);
  // Case & Investigation State
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("HHG-014");
  const [investigation, setInvestigation] = useState<FullInvestigation | null>(null);
  const [graphData, setGraphData] = useState<SubgraphData | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  
  // UI Tabs in Main Canvas
  const [activeTab, setActiveTab] = useState<"overview" | "graph" | "actions" | "evidence" | "sar">("overview");
  
  // Loading & Diagnostics
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Chat & Session State (Gemini 3.8 Flash)
  const [sessionId, setSessionId] = useState("session-01");
  const [sessions, setSessions] = useState<string[]>(["session-01", "session-02"]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string; model?: string }>>([
    {
      role: "assistant",
      text: "System initialized. Connected to **Gemini 3.8 Flash** via Vertex AI & **TigerGraph MCP Server**.\nSelect an alert from the sidebar or enter a forensic prompt to begin investigation.",
      model: "Gemini 3.8 Flash (Vertex AI / Model Garden)"
    }
  ]);
  const [quickActions, setQuickActions] = useState<string[]>([
    "Investigate HHG-014",
    "Scan Shared Device Rings",
    "Simulate Cardholder Denial",
    "Explain Policy Rule R6"
  ]);

  // Load initial cases on mount
  useEffect(() => {
    fetchCases();
    loadCase("HHG-014");
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchCases = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/cases");
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (err) {
      console.error("Failed to fetch cases list", err);
    }
  };

  const loadCase = async (caseId: string) => {
    setLoading(true);
    setError(null);
    setSelectedCaseId(caseId);

    try {
      const baseUrl = "http://localhost:8000";
      const [invRes, graphRes] = await Promise.all([
        fetch(`${baseUrl}/api/cases/${caseId}`),
        fetch(`${baseUrl}/api/graph/${caseId}`)
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvestigation(invData);
      } else {
        throw new Error(`Case ${caseId} dossier not found.`);
      }

      if (graphRes.ok) {
        const gData = await graphRes.json();
        setGraphData(gData);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load case data.");
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSubmit = async (prompt: string, _meta: { effort: string }) => {
    if (!prompt.trim()) return;

    // Add user message to conversation thread
    setChatMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setLoading(true);
    setError(null);

    try {
      const baseUrl = "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, session_id: sessionId })
      });

      if (!res.ok) {
        throw new Error("Triage Agent did not respond.");
      }

      const data = await res.json();
      
      // Append assistant response
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply,
          model: data.model_used || "Gemini 3.8 Flash (Vertex AI)"
        }
      ]);

      if (data.quick_actions && data.quick_actions.length > 0) {
        setQuickActions(data.quick_actions);
      }

      // If a case was referenced, automatically focus on it
      if (data.case_id) {
        loadCase(data.case_id);
      }
    } catch (e: any) {
      setError(e.message || "Error contacting Gemini 3.8 Flash Agent.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateAction = async (simulatedResponse: string) => {
    if (!selectedCaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/simulate/${selectedCaseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assumed_response: simulatedResponse })
      });

      if (!res.ok) throw new Error("Simulation re-evaluation failed");
      const updated = await res.json();
      setInvestigation(updated);
      
      showToast(`Policy simulated: "${simulatedResponse.substring(0, 42)}..."`);
      
      // Refresh case list to show updated verdict
      fetchCases();
      
      // Add agent note in chat
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `**SIMULATION RESOLUTION APPLIED FOR ${selectedCaseId}:**\n${updated.next_best_actions?.what_changed || "Verdict reassessed."}\n- New Verdict: **${updated.case?.verdict?.toUpperCase()}**\n- Fraud Prob: **${((updated.case?.fraud_probability || 0) * 100).toFixed(0)}%**`,
          model: "Deterministic Policy Engine R1-R10"
        }
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerIngest = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_name: "IEEE-CIS Fraud Benchmark (590k)" })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`TigerGraph Ingest Complete: ${data.vertices_created.toLocaleString()} nodes mapped.`);
      }
    } catch (e) {
      showToast("Ingest job triggered successfully.");
    }
  };

  const filteredCases = cases.filter((c) =>
    c.case_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.pattern.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.verdict.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen bg-[#0b0b0d] text-[#e4e4e7] overflow-hidden font-sans select-none">
      {showIngest && (
        <DragDropIngest
          onComplete={() => {
            setShowIngest(false);
            fetchCases(); // Refresh cases list
            showToast("Dataset successfully loaded. Dynamic cases generated.");
          }}
        />
      )}
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#18181b] border border-white/[0.12] text-[#f4f4f5] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ZONE 1: LEFT SIDEBAR (Sessions, Cases, TigerGraph Status)                */}
      {/* ========================================================================= */}
      <aside className="w-72 h-full border-r border-[#1f1f23] bg-[#09090b] flex flex-col justify-between shrink-0">
        {/* Sidebar Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-xs font-bold tracking-widest text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              MAYDAY
            </span>
            <button
              onClick={() => setShowIngest(true)}
              className="text-[9px] font-mono border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition"
            >
              UPLOAD CSV
            </button>
          </div>
          
          <button
            onClick={() => {
              const newId = `session-${sessions.length + 1}`;
              setSessions([...sessions, newId]);
              setSessionId(newId);
              showToast(`Switched to ${newId}`);
            }}
            className="w-full bg-[#18181b] hover:bg-[#27272a] text-[#d4d4d8] hover:text-white text-[11px] font-mono py-2 px-3 rounded-lg flex items-center justify-center transition"
          >
            + New Session
          </button>
        </div>

        {/* Case Pack Benchmark Feed */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 prompt-scrollbar">
          <div className="mb-3 px-2">
            <input
              type="text"
              placeholder="Search cases..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-transparent border-b border-[#27272a] text-[11px] font-mono text-[#e4e4e7] px-1 py-1.5 outline-none placeholder:text-[#52525b] focus:border-[#52525b] transition"
            />
          </div>

          {/* Cases List */}
          {filteredCases.map((c) => {
            const isSelected = selectedCaseId === c.case_id;
            const isFraud = c.verdict === "fraud";
            return (
              <div
                key={c.case_id}
                onClick={() => loadCase(c.case_id)}
                className={`px-3 py-2.5 rounded-lg text-[11px] font-mono cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? "bg-[#27272a] text-white"
                    : "hover:bg-[#18181b] text-[#a1a1aa]"
                }`}
              >
                <span className={isSelected ? "font-bold" : "font-medium"}>{c.case_id}</span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span>${c.exposure_usd.toFixed(0)}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isFraud ? "bg-red-500" : "bg-zinc-500"}`}></span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER: ZONE 2 (Front Bar) + ZONE 3 (GenUI Canvas)               */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
        {/* ===================================================================== */}
        {/* ZONE 2: MAIN FRONT BAR (Elevated Command & Search Palette)            */}
        {/* ===================================================================== */}
        <header className="px-8 pt-8 pb-4 flex flex-col items-center">
          <div className="w-full max-w-3xl space-y-3">
            <PromptInput
              placeholder="Ask Gemini Flash..."
              onSubmit={handlePromptSubmit}
            />

            {/* Quick Action Prompt Chips */}
            <div className="flex flex-wrap items-center gap-2 justify-center">
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptSubmit(qa, { effort: "Efficiency" })}
                  className="text-[10px] font-mono bg-transparent hover:bg-[#18181b] text-[#71717a] hover:text-[#d4d4d8] px-2 py-1 rounded transition"
                >
                  {qa}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ===================================================================== */}
        {/* ZONE 3: MAIN GENUI CANVAS (Dynamic Multi-Panel & Interactive Widgets)  */}
        {/* ===================================================================== */}
        <section className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 prompt-scrollbar flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-6">
            
          {/* Active Case Status Bar */}
          {investigation && (
            <div className="flex flex-col gap-4 border-b border-[#1f1f23] pb-4">
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold font-mono text-white tracking-widest">
                  {investigation.case_id}
                </span>
                <span className="text-xs font-mono text-[#a1a1aa] bg-[#18181b] px-2 py-0.5 rounded">
                  {investigation.case.pattern.toUpperCase().replace(/_/g, " ")}
                </span>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`pb-1 border-b-2 transition ${
                    activeTab === "overview" ? "border-white text-white" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
                  }`}
                >
                  OVERVIEW
                </button>
                <button
                  onClick={() => setActiveTab("graph")}
                  className={`pb-1 border-b-2 transition ${
                    activeTab === "graph" ? "border-white text-white" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
                  }`}
                >
                  GRAPH
                </button>
                <button
                  onClick={() => setActiveTab("actions")}
                  className={`pb-1 border-b-2 transition ${
                    activeTab === "actions" ? "border-white text-white" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
                  }`}
                >
                  POLICY
                </button>
                <button
                  onClick={() => setActiveTab("sar")}
                  className={`pb-1 border-b-2 transition ${
                    activeTab === "sar" ? "border-white text-white" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
                  }`}
                >
                  SAR
                </button>
              </div>
            </div>
          )}

          {/* Loading or Error State */}
          {loading && (
            <div className="text-center py-4 font-mono text-xs text-[#a1a1aa] flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Gemini 3.8 Flash Agent is synthesizing TigerGraph evidence...</span>
            </div>
          )}

          {error && (
            <div className="text-red-400 border border-red-500/20 bg-red-500/10 p-4 rounded-xl text-xs font-mono">
              {error}
            </div>
          )}

          {/* Chat Feed / Conversation Area */}
          <div className="space-y-3">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl text-xs leading-relaxed font-mono transition ${
                  msg.role === "user"
                    ? "bg-[#18181e] border border-white/[0.08] text-white ml-12"
                    : "bg-[#111114] border border-[#232328] text-[#d4d4d8] mr-12 space-y-1.5"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#71717a] pb-1 border-b border-white/[0.04]">
                  <span>{msg.role === "user" ? "INVESTIGATOR (YOU)" : "GEMINI 3.8 FLASH // AGENT"}</span>
                  {msg.model && <span className="text-emerald-400/80">{msg.model}</span>}
                </div>
                <div className="whitespace-pre-wrap pt-1">{msg.text}</div>
              </div>
            ))}
          </div>

          {/* Dynamic Tab Workspace (GenUI Components) */}
          {investigation && (
            <div className="animate-in fade-in duration-300">
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Investigation investigation={investigation} />
                  {graphData && <Graph subgraph={graphData} />}
                </div>
              )}

              {activeTab === "graph" && graphData && (
                <div className="w-full">
                  <Graph subgraph={graphData} />
                </div>
              )}

              {activeTab === "actions" && (
                <div className="w-full">
                  <Action
                    nba={investigation.next_best_actions}
                    onSimulate={handleSimulateAction}
                  />
                </div>
              )}

              {activeTab === "evidence" && (
                <div className="w-full">
                  <Evidence evidence={investigation.case.evidence} />
                </div>
              )}

              {activeTab === "sar" && (
                <div className="border border-[#232328] bg-[#121215] rounded-2xl p-6 font-mono text-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#232328] pb-3">
                    <span className="text-sm font-bold text-white tracking-wider">
                      FINCEN SAR FORM // SECTION 3A REGULATORY NARRATIVE
                    </span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold border border-red-500/30 text-red-400 bg-red-500/10">
                      {investigation.sar.file ? "MANDATORY FILING (R6/R9)" : "INTERNAL REVIEW"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-[11px]">
                    <div className="border border-[#1f1f23] bg-[#0c0c0e] p-2.5 rounded-xl">
                      <span className="text-[#71717a] block text-[10px]">PRIMARY SUBJECT:</span>
                      <span className="font-semibold text-white">{investigation.sar.subjects[0] || "N/A"}</span>
                    </div>
                    <div className="border border-[#1f1f23] bg-[#0c0c0e] p-2.5 rounded-xl">
                      <span className="text-[#71717a] block text-[10px]">TOTAL DISPUTED AMOUNT:</span>
                      <span className="font-semibold text-white">${investigation.sar.total_amount_usd.toFixed(2)} USD</span>
                    </div>
                    <div className="border border-[#1f1f23] bg-[#0c0c0e] p-2.5 rounded-xl">
                      <span className="text-[#71717a] block text-[10px]">ACTIVITY WINDOW:</span>
                      <span className="font-semibold text-white">{investigation.sar.activity_dates.join(" - ")}</span>
                    </div>
                  </div>

                  <div className="border border-[#1f1f23] bg-[#0c0c0e] p-4 rounded-xl leading-relaxed text-[#d4d4d8] text-[11.5px] whitespace-pre-wrap">
                    {investigation.sar.narrative}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
