import React from "react";
import { NextBestActions } from "../types/investigation";

interface ActionProps {
  nba: NextBestActions | null;
  onSimulate?: (response: string) => void;
}

export const Action: React.FC<ActionProps> = ({ nba, onSimulate }) => {
  if (!nba) return null;

  return (
    <div className="w-full border border-[#232328] bg-[#121215] rounded-2xl p-5 shadow-2xl text-xs font-mono space-y-4">
      <div className="flex items-center justify-between border-b border-[#232328] pb-2">
        <span className="text-[10.5px] uppercase tracking-wider text-[#71717a] font-semibold">
          NEXT BEST ACTION MATRIX // POLICY R1–R10
        </span>
        <span className="text-[9px] text-[#52525b] border border-[#232328] px-2 py-0.5 rounded-full">
          DETERMINISTIC
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Stage 1: Pre-Evidence */}
        <div className="border border-[#1f1f23] bg-[#0c0c0e] p-3 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-[#71717a] mb-2">
            <span>STAGE 1: INITIAL (PRE-EVIDENCE)</span>
            <span className="text-[#a1a1aa]">R1/R5</span>
          </div>
          <div className="space-y-1.5">
            {nba.initial.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-0.5">
                <span className="text-[#e4e4e7] font-semibold">{a.action}</span>
                <span className="border border-[#2a2a30] text-[#a1a1aa] px-1.5 py-0.2 rounded text-[9px]">
                  {a.route}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 2: Post-Evidence */}
        <div className="border border-[#1f1f23] bg-[#0c0c0e] p-3 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-[#71717a] mb-2">
            <span>STAGE 2: FINAL (POST-EVIDENCE)</span>
            <span className="text-[#a1a1aa]">R2/R3/R6</span>
          </div>
          <div className="space-y-1.5">
            {nba.final.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-0.5">
                <span className="text-[#ffffff] font-semibold">{a.action}</span>
                <span className="border border-[#3f3f46] text-[#ffffff] px-1.5 py-0.2 rounded text-[9px] bg-[#18181b]">
                  {a.route}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transition Diff */}
      <div className="border border-[#1f1f23] bg-[#0c0c0e] p-3 rounded-xl text-[11px] text-[#a1a1aa] leading-relaxed">
        <span className="text-[#e4e4e7] font-semibold block mb-0.5">WHAT CHANGED:</span>
        {nba.what_changed}
      </div>

      {/* Interactive Simulation Controls */}
      {onSimulate && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onSimulate("Customer confirms they made this transaction.")}
            className="flex-1 border border-[#27272a] hover:border-[#52525b] bg-[#17171b] hover:bg-[#1f1f24] text-[#a1a1aa] hover:text-[#f4f4f5] text-[10.5px] py-1.5 rounded-lg transition active:scale-95"
          >
            [ SIMULATE: CONFIRM ]
          </button>
          <button
            onClick={() => onSimulate("Customer denies making or authorizing this transaction.")}
            className="flex-1 border border-[#27272a] hover:border-[#52525b] bg-[#17171b] hover:bg-[#1f1f24] text-[#a1a1aa] hover:text-[#f4f4f5] text-[10.5px] py-1.5 rounded-lg transition active:scale-95"
          >
            [ SIMULATE: DENY ]
          </button>
        </div>
      )}
    </div>
  );
};
