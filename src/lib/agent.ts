import { CaseListItem, FullInvestigation } from "../types/investigation";
import { SubgraphData } from "./tigergraph";

const API_BASE = "";

export async function fetchCases(): Promise<CaseListItem[]> {
  const res = await fetch(`${API_BASE}/api/cases`);
  if (!res.ok) throw new Error("Failed to fetch cases list");
  return res.json();
}

export async function fetchCase(caseId: string): Promise<FullInvestigation> {
  const res = await fetch(`${API_BASE}/api/cases/${caseId}`);
  if (!res.ok) throw new Error(`Failed to fetch case ${caseId}`);
  return res.json();
}

export async function fetchGraph(caseId: string): Promise<SubgraphData> {
  const res = await fetch(`${API_BASE}/api/graph/${caseId}`);
  if (!res.ok) throw new Error(`Failed to fetch subgraph for ${caseId}`);
  return res.json();
}

export async function simulateEvidence(caseId: string, assumedResponse: string): Promise<FullInvestigation> {
  const res = await fetch(`${API_BASE}/api/simulate/${caseId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assumed_response: assumedResponse })
  });
  if (!res.ok) throw new Error("Failed to simulate evidence resolution");
  return res.json();
}
