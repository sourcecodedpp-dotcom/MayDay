import React from "react";
import { FullInvestigation } from "../types/investigation";

interface TimelineProps {
  investigation: FullInvestigation | null;
}

export const Timeline: React.FC<TimelineProps> = ({ investigation }) => {
  if (!investigation) return null;

  const { case: c, evidence_requests, latency_s, tool_calls, tokens } = investigation;

  const steps = [
    {
      title: "TRIGGER DISPATCHED",
      subtitle: `Fraud alert detected on ${c.connected_card_ids[0] || "Card"}`,
      time: "0.0s",
      status: "done",
      detail: c.pattern_description
    },
    {
      title: "TIGERGRAPH GSQL QUERIES",
      subtitle: `${tool_calls} MCP tool calls executed against FraudGraph`,
      time: `${(latency_s * 0.35).toFixed(1)}s`,
      status: "done",
      detail: `Traversed 2-hop neighborhood: ${c.affected_txn_ids.length} txns, ${c.connected_device_profiles.length} devices.`
    },
    {
      title: "STAGE 1 REASONING (INITIAL NBA)",
      subtitle: "Deterministic Policy Engine evaluation (pre-evidence)",
      time: `${(latency_s * 0.6).toFixed(1)}s`,
      status: "done",
      detail: `Calculated fraud probability: ${(c.fraud_probability * 100).toFixed(0)}%.`
    },
    ...(evidence_requests.length > 0 ? evidence_requests.map((req, i) => ({
      title: `EVIDENCE DISCOVERY: ${req.type.toUpperCase().replace("_", " ")}`,
      subtitle: `Inquiry after step ${req.asked_after_step}`,
      time: `${(latency_s * 0.8).toFixed(1)}s`,
      status: "done",
      detail: `Assumed customer response: "${req.assumed_response}"`
    })) : []),
    {
      title: "STAGE 2 FINAL RESOLUTION",
      subtitle: `Policy Rules R1–R10 applied · Verdict: ${c.verdict.toUpperCase()}`,
      time: `${latency_s.toFixed(1)}s`,
      status: "done",
      detail: c.written_to_graph ? "Knowledge Graph writeback committed." : "Investigation concluded."
    }
  ];

  return (
    <div className="w-full border border-[#232328] bg-[#121215] rounded-2xl p-5 shadow-2xl text-xs font-mono space-y-4">
      <div className="flex items-center justify-between border-b border-[#232328] pb-2">
        <span className="text-[10.5px] uppercase tracking-wider text-[#71717a] font-semibold">
          AGENT AUDIT TIMELINE // AUTONOMOUS REASONING
        </span>
        <span className="text-[9px] text-[#52525b] border border-[#232328] px-2 py-0.5 rounded-full">
          {tokens} TOKENS · {latency_s.toFixed(2)}s
        </span>
      </div>

      <div className="relative pl-6 space-y-4 border-l border-[#27272a] ml-2">
        {steps.map((s, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline bullet dot */}
            <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-[#18181b] border border-[#71717a] group-hover:border-white transition" />
            
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#f4f4f5] tracking-wide">
                {s.title}
              </span>
              <span className="text-[9px] text-[#71717a]">{s.time}</span>
            </div>
            
            <p className="text-[10px] text-[#a1a1aa] mt-0.5">
              {s.subtitle}
            </p>

            {s.detail && (
              <p className="text-[9.5px] text-[#71717a] mt-1 bg-[#0c0c0e] border border-[#1f1f23] p-1.5 rounded">
                {s.detail}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
