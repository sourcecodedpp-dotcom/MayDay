import React from "react";
import { FullInvestigation } from "../types/investigation";

interface InvestigationProps {
  investigation: FullInvestigation | null;
}

export const Investigation: React.FC<InvestigationProps> = ({ investigation }) => {
  if (!investigation) return null;

  const { case_id, case: c, sar } = investigation;
  const isFraud = c.verdict === "fraud";

  return (
    <div className="w-full border border-[#232328] bg-[#121215] rounded-2xl p-5 shadow-2xl text-xs font-mono">
      <div className="flex items-center justify-between border-b border-[#232328] pb-3 mb-4">
        <div>
          <span className="text-sm font-bold text-white tracking-wider">{case_id}</span>
          <span className="text-[#71717a] ml-2 text-[11px]">PATTERN: {c.pattern.toUpperCase()}</span>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${
          isFraud ? "border-[#52525b] text-[#f4f4f5] bg-[#18181b]" : "border-[#3f3f46] text-[#a1a1aa] bg-[#18181b]"
        }`}>
          {c.verdict.toUpperCase()} · ${c.exposure_usd.toFixed(2)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-[11px]">
        <div className="border border-[#1f1f23] bg-[#0c0c0e] p-2.5 rounded-xl">
          <span className="text-[#71717a] block text-[10px] mb-0.5">CUSTOMER & CARD</span>
          <span className="text-[#e4e4e7] font-semibold">{c.connected_card_ids[0] || "CARD-ACTIVE"}</span>
        </div>
        <div className="border border-[#1f1f23] bg-[#0c0c0e] p-2.5 rounded-xl">
          <span className="text-[#71717a] block text-[10px] mb-0.5">FRAUD PROBABILITY</span>
          <span className="text-[#e4e4e7] font-semibold">{(c.fraud_probability * 100).toFixed(0)}%</span>
        </div>
      </div>

      <p className="text-[#a1a1aa] leading-relaxed text-[11.5px] mb-3">
        {c.summary}
      </p>

      {sar.file && (
        <div className="border-t border-[#232328] pt-3 text-[10.5px] text-[#71717a] leading-normal">
          <span className="text-[#e4e4e7] font-semibold block mb-1">[REGULATORY SAR FILED - SECTION 3A]</span>
          <p className="italic text-[#a1a1aa]">{sar.narrative}</p>
        </div>
      )}
    </div>
  );
};
