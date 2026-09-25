import { createVertex } from "@ai-sdk/google-vertex";
import { streamText, tool, stepCountIs } from "ai";
import { generateSystemPrompt } from "@openuidev/lang-core";
import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";

const vertex = createVertex({
  project: "persuasive-axe-506219-h9",
  location: "global",
});

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const MAYDAY_INSTRUCTIONS = `
You are MayDay, the world's most elite agentic fraud intelligence cockpit.
You are backed by TigerGraph (graph store) and Gemini 3.8 Flash (Vertex AI reasoning engine).

═══════════════════════════════════════════════
 LEKH DSL — UNIFIED SPECIFICATION LANGUAGE
═══════════════════════════════════════════════
MayDay uses the 'Lekh' DSL for ALL context management, case files, logic review, and SAR reports.
Lekh syntax is minimal: just bracket + text (no braces, no semicolons).

  [CONTEXT session=<id> model=<model> cache=ENABLED focus=<case_id>]
  [CASE <case_id> verdict=<v> risk=<r> exposure=<usd> pattern=<p>]
  [NODE <type> id=<id> label="<label>"]
  [EDGE <src> -> <tgt> label=<label>]
  [REVIEW rule=<name> trigger="<condition>" action=<action> status=<STATUS>]
  [REPORT <case_id> subject=<cust> verdict=<v> sar=<TRUE|FALSE> narrative="<text>"]

When asked for a case, report, or logic review:
1. Always call TigerGraph MCP tools first to get real data.
2. Render the Lekh DSL inside a shadcn CodeBlock or TextContent block.
3. Then render your full OpenUI Lang UI (Card, Table, Accordion, Badge, etc.).

═══════════════════════════════════════════════
 THINKING & REASONING TOKENS DISPLAY
═══════════════════════════════════════════════
ALWAYS start your root Card with an expandable Accordion showing your active thinking tokens:
  thinkingAccordion = Accordion([thinkingItem], "single")
  thinkingItem = AccordionItem("t1", "🧠 Gemini 3.8 Flash Reasoning (Active Thinking Tokens)", [thinkingText])
  thinkingText = TextContent("• Queried TigerGraph MCP via graph pattern matching.\\n• Evaluated Lekh DSL rules against topology.\\n• Synthesized OpenUI generative UI response.")

═══════════════════════════
 OPENUI LANG RULES
═══════════════════════════
- Entry point must be: root = Card([...])
- Use: CardHeader, Table, Col, Badge, Tabs, Accordion, Alert, FollowUpBlock.
- Never output raw markdown as the final answer.
- Always include FollowUpBlock with 3 context-relevant actions.
`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const library = JSON.parse(
      readFileSync(join(process.cwd(), "src/generated/spec.json"), "utf-8"),
    );

    const systemPrompt = generateSystemPrompt({
      library,
      instructions: MAYDAY_INSTRUCTIONS,
    });

    const result = streamText({
      model: vertex("gemini-3.8-flash"),
      system: systemPrompt,
      messages,
      maxRetries: 3,
      stopWhen: stepCountIs(5),
      tools: {
        list_tigergraph_cases: tool({
          description: "List all fraud alert cases in TigerGraph database.",
          inputSchema: z.object({}),
          execute: async () => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/cases`, { cache: "no-store" });
              if (!res.ok) return { error: `Backend error: ${res.statusText}` };
              return await res.json();
            } catch (e: any) { return { error: e.message }; }
          },
        }),
        get_tigergraph_dossier: tool({
          description: "Get full investigation dossier (exposure, devices, graph topology) for a case.",
          inputSchema: z.object({ case_id: z.string().describe("Case ID e.g. HHG-001") }),
          execute: async ({ case_id }: { case_id: string }) => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/cases/${case_id.trim()}`, { cache: "no-store" });
              if (!res.ok) return { error: `Case ${case_id} not found` };
              return await res.json();
            } catch (e: any) { return { error: e.message }; }
          },
        }),
        get_case_in_lekh: tool({
          description: "Get a case in Lekh DSL format: [CONTEXT] [CASE] [NODE] [EDGE] [REVIEW] [REPORT].",
          inputSchema: z.object({ case_id: z.string().describe("Case ID e.g. HHG-001") }),
          execute: async ({ case_id }: { case_id: string }) => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/lekh/${case_id.trim()}`, { cache: "no-store" });
              if (!res.ok) return { error: `Lekh not found for ${case_id}` };
              return await res.json();
            } catch (e: any) { return { error: e.message }; }
          },
        }),
        get_tigergraph_subgraph: tool({
          description: "Query graph nodes and edges for a case from TigerGraph.",
          inputSchema: z.object({ case_id: z.string() }),
          execute: async ({ case_id }: { case_id: string }) => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/graph/${case_id}`, { cache: "no-store" });
              if (!res.ok) return { error: `Graph not found for ${case_id}` };
              return await res.json();
            } catch (e: any) { return { error: e.message }; }
          },
        }),
        simulate_analyst_action: tool({
          description: "Simulate an analyst response on a fraud case.",
          inputSchema: z.object({
            case_id: z.string(),
            assumed_response: z.string(),
          }),
          execute: async ({ case_id, assumed_response }: { case_id: string; assumed_response: string }) => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/simulate/${case_id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assumed_response }),
              });
              return await res.json();
            } catch (e: any) { return { error: e.message }; }
          },
        }),
      },
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.fullStream) {
            if (chunk.type === "text-delta") {
              const payload = { choices: [{ delta: { content: chunk.text } }] };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ finish_reason: "stop" }] })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e: any) {
          const isQuota = e?.statusCode === 429 || e?.message?.includes("RESOURCE_EXHAUSTED");
          const msg = isQuota
            ? `root = Card([hdr, errAlert, followUps])\nhdr = CardHeader("MayDay Cockpit", "Vertex AI Rate Limit Handling")\nerrAlert = Alert("⚠️ Vertex AI Rate Limit (429)", "Requests per minute limit reached on Gemini 3.8 Flash. Automatic retry in progress. Wait ~30-60s for next call.", "destructive")\nfollowUps = FollowUpBlock([fu1, fu2, fu3])\nfu1 = FollowUpItem("List active fraud cases")\nfu2 = FollowUpItem("Get Lekh DSL for HHG-010")\nfu3 = FollowUpItem("Investigate HHG-003")`
            : `root = Card([errAlert])\nerrAlert = Alert("Investigation Notice", "${e.message?.slice(0, 180)?.replace(/"/g, "'")}", "destructive")`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: msg } }] })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
