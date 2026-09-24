import React from "react";
import { EvidenceItem } from "../types/investigation";

interface EvidenceProps {
  evidence: EvidenceItem[];
  onSelectEntity?: (entityId: string) => void;
}

export const Evidence: React.FC<EvidenceProps> = ({ evidence, onSelectEntity }) => {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="w-full border border-[#232328] bg-[#121215] rounded-2xl p-5 shadow-2xl text-xs font-mono text-[#71717a]">
        No evidence items recorded.
      </div>
    );
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "graph":
        return {
          label: "TIGERGRAPH GSQL",
          bg: "bg-[#18181b]",
          border: "border-[#3f3f46]",
          text: "text-[#f4f4f5]"
        };
      case "customer":
        return {
          label: "CUSTOMER DISPUTE",
          bg: "bg-[#18181b]",
          border: "border-[#3f3f46]",
          text: "text-[#e4e4e7]"
        };
      case "document":
        return {
          label: "DOCUMENT DOC",
          bg: "bg-[#18181b]",
          border: "border-[#27272a]",
          text: "text-[#a1a1aa]"
        };
      default:
        return {
          label: "TELEMETRY",
          bg: "bg-[#18181b]",
          border: "border-[#27272a]",
          text: "text-[#71717a]"
        };
    }
  };

  return (
    <div className="w-full border border-[#232328] bg-[#121215] rounded-2xl p-5 shadow-2xl text-xs font-mono space-y-3">
      <div className="flex items-center justify-between border-b border-[#232328] pb-2">
        <span className="text-[10.5px] uppercase tracking-wider text-[#71717a] font-semibold">
          EVIDENCE STREAM // RESOLVED CLAIMS ({evidence.length})
        </span>
        <span className="text-[9px] text-[#52525b] border border-[#232328] px-2 py-0.5 rounded-full">
          GSQL AUDITED
        </span>
      </div>

      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {evidence.map((item, idx) => {
          const badge = getSourceBadge(item.source);
          return (
            <div
              key={idx}
              className="border border-[#1f1f23] hover:border-[#38383e] bg-[#0c0c0e] hover:bg-[#111114] p-3 rounded-xl transition duration-200"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${badge.border} ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
                <span className="text-[9.5px] text-[#71717a] tracking-tight">
                  REF: {item.ref}
                </span>
              </div>
              <p className="text-[#e4e4e7] text-[11.5px] leading-relaxed mb-2">
                {item.claim}
              </p>
              {item.entity_ids && item.entity_ids.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center pt-1 border-t border-[#18181b]">
                  <span className="text-[9px] text-[#52525b]">ENTITIES:</span>
                  {item.entity_ids.map((id, eIdx) => (
                    <button
                      key={eIdx}
                      onClick={() => onSelectEntity?.(id)}
                      className="text-[9.5px] text-[#a1a1aa] hover:text-white bg-[#18181b] hover:bg-[#27272a] px-1.5 py-0.5 rounded transition"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
