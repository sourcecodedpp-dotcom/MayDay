// ==============================================================================
// TigerGraph Knowledge Graph Entities & Type Definitions
// ==============================================================================

export type GraphNodeType = "customer" | "card" | "flagged_txn" | "device" | "connected_card" | "prior_case";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  group: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface SubgraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
