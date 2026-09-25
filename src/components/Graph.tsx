import React, { useState } from "react";
import { SubgraphData, GraphNode } from "../lib/tigergraph";

interface GraphProps {
  subgraph: SubgraphData | null;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
}

export const Graph: React.FC<GraphProps> = ({ subgraph, selectedNodeId, onSelectNode }) => {
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  if (!subgraph || subgraph.nodes.length === 0) {
    return (
      <div className="w-full h-80 border border-[#232328] bg-[#121215] rounded-2xl flex flex-col items-center justify-center text-xs font-mono text-[#71717a] shadow-2xl">
        <svg className="w-8 h-8 mb-2 opacity-30 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.93 4.93l2.12 2.12m9.9 9.9l2.12 2.12M4.93 19.07l2.12-2.12m9.9-9.9l2.12-2.12" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>AWAITING TIGERGRAPH SUBGRAPH SELECTION</span>
      </div>
    );
  }

  // Simple layout computation for nodes
  const width = 640;
  const height = 340;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.36;

  const nodeCount = subgraph.nodes.length;
  const positions: Record<string, { x: number; y: number }> = {};

  subgraph.nodes.forEach((node, i) => {
    // If it's a customer or central card, put in center/near-center
    if (i === 0) {
      positions[node.id] = { x: centerX, y: centerY };
    } else {
      const angle = ((i - 1) / (nodeCount - 1)) * 2 * Math.PI - Math.PI / 2;
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle) + (Math.sin(i * 3) * 15),
        y: centerY + radius * Math.sin(angle) + (Math.cos(i * 3) * 15)
      };
    }
  });

  const getNodeColor = (type: string, isSelected: boolean) => {
    if (isSelected) return { stroke: "#ffffff", fill: "#27272a", text: "#ffffff" };
    switch (type) {
      case "customer":
        return { stroke: "#a1a1aa", fill: "#18181b", text: "#f4f4f5" };
      case "flagged_txn":
        return { stroke: "#71717a", fill: "#222226", text: "#ffffff" };
      case "device":
        return { stroke: "#52525b", fill: "#141417", text: "#e4e4e7" };
      case "card":
      case "connected_card":
        return { stroke: "#3f3f46", fill: "#111114", text: "#a1a1aa" };
      default:
        return { stroke: "#27272a", fill: "#0c0c0e", text: "#71717a" };
    }
  };

  return (
    <div className="w-full border border-[#232328] bg-[#121215] rounded-2xl p-5 shadow-2xl text-xs font-mono space-y-3 relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#232328] pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] uppercase tracking-wider text-[#71717a] font-semibold">
            TIGERGRAPH 2-HOP SUBGRAPH // REAL-TIME KNOWLEDGE GRAPH
          </span>
          <span className="text-[9px] text-[#52525b] border border-[#232328] px-2 py-0.5 rounded-full">
            {subgraph.nodes.length} NODES · {subgraph.edges.length} EDGES
          </span>
        </div>
        {hoveredNode && (
          <span className="text-[10px] text-[#a1a1aa] bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded">
            {hoveredNode.label} ({hoveredNode.type})
          </span>
        )}
      </div>

      <div className="relative w-full h-[340px] bg-[#0c0c0e] rounded-xl border border-[#1f1f23] overflow-hidden flex items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
        >
          {/* Edges */}
          <g>
            {subgraph.edges.map((edge, idx) => {
              const src = positions[edge.source];
              const tgt = positions[edge.target];
              if (!src || !tgt) return null;

              return (
                <g key={idx}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke="#27272a"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    className="transition-all duration-300"
                  />
                  <text
                    x={(src.x + tgt.x) / 2}
                    y={(src.y + tgt.y) / 2 - 4}
                    fill="#52525b"
                    fontSize="8"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {subgraph.nodes.map((node) => {
              const pos = positions[node.id] || { x: centerX, y: centerY };
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNode?.id === node.id;
              const colors = getNodeColor(node.type, isSelected);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer transition-transform duration-200"
                  onClick={() => onSelectNode?.(node.id)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Subtle Glow ring on hover/selected */}
                  {(isSelected || isHovered) && (
                    <circle
                      r="22"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1"
                      opacity={isSelected ? "0.4" : "0.2"}
                      className="animate-ping"
                    />
                  )}
                  <circle
                    r={isSelected ? "17" : "15"}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? "2" : "1.2"}
                    className="transition-all duration-200"
                  />
                  <text
                    textAnchor="middle"
                    dy="3"
                    fill={colors.text}
                    fontSize={node.label.length > 8 ? "7.5" : "8.5"}
                    fontWeight={isSelected ? "bold" : "normal"}
                    className="pointer-events-none select-none font-mono"
                  >
                    {node.label}
                  </text>
                  <text
                    textAnchor="middle"
                    dy="25"
                    fill="#71717a"
                    fontSize="7"
                    className="pointer-events-none select-none font-mono uppercase"
                  >
                    {node.type.replace("_", " ")}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
