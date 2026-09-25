import React from "react";
import { Registry } from "@json-render/react";

export const registry: Registry = {
  components: {
    Container: ({ props, slots }) => {
      const { direction, gap, padding } = props;
      return (
        <div 
          style={{ 
            display: "flex", 
            flexDirection: direction === "col" ? "column" : "row",
            gap: `${gap * 4}px`,
            padding: `${padding * 4}px`
          }}
        >
          {slots.default}
        </div>
      );
    },
    FraudMetric: ({ props }) => {
      return (
        <div className={`p-3 rounded-lg border ${props.alert ? 'bg-red-500/10 border-red-500/30' : 'bg-[#18181b] border-[#27272a]'}`}>
          <div className="text-[10px] uppercase text-zinc-500 font-mono mb-1">{props.label}</div>
          <div className={`font-mono text-lg font-bold ${props.alert ? 'text-red-400' : 'text-zinc-200'}`}>
            {props.value}
          </div>
        </div>
      );
    },
    DossierCard: ({ props, slots }) => (
      <div className="bg-[#0c0c0e] border border-[#27272a] rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-[#141418] border-b border-[#27272a] font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
          {props.title}
        </div>
        <div className="p-4">
          {slots.default}
        </div>
      </div>
    ),
    Verdict: ({ props }) => {
      const colors = {
        fraud: "bg-red-500/20 text-red-500 border-red-500/30",
        cleared: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
        investigating: "bg-amber-500/20 text-amber-500 border-amber-500/30"
      };
      return (
        <div className={`p-4 rounded-lg border ${colors[props.status]} flex flex-col gap-2`}>
          <div className="font-mono font-bold uppercase tracking-widest text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
            VERDICT: {props.status}
          </div>
          <div className="text-xs opacity-80">{props.reason}</div>
        </div>
      );
    },
    Text: ({ props }) => {
      const styleClass = props.style === "bold" ? "font-bold text-white" 
        : props.style === "muted" ? "text-zinc-500 text-sm" 
        : "text-zinc-300";
      return <div className={`font-sans ${styleClass}`}>{props.content}</div>;
    }
  }
};
