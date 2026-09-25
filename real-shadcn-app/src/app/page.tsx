"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { shadcnChatLibrary } from "@/lib/shadcn-genui";
import {
  ChatProvider,
  fetchLLM,
  openAIAdapter,
  openAIMessageFormat,
  useThread,
  MessageProvider,
} from "@openuidev/react-ui";
import { Renderer } from "@openuidev/react-lang";
import {
  UploadCloud,
  ShieldAlert,
  RefreshCw,
  Brain,
  Zap,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CaseItem {
  case_id: string;
  trigger_text: string;
  risk_score: number;
  verdict: string;
  exposure_usd?: number;
}

interface ThinkingMeta {
  thinkingTokens: number;
  totalTokens: number;
  steps: number;
}

// ─── Headless chat messages ─────────────────────────────────────────────────
function MayDayChatUI({ onMeta }: { onMeta: (m: ThinkingMeta) => void }) {
  const thread = useThread();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.messages]);

  const submit = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || isStreaming) return;
      setInput("");
      setIsStreaming(true);
      try {
        await thread.processMessage({ content: msg, role: "user" });
        // Approximate thinking token count from response length
        const msgs = thread.messages;
        const last = msgs[msgs.length - 1];
        if (last?.role === "assistant") {
          const len = String(last.content || "").length;
          onMeta({
            thinkingTokens: Math.max(96, Math.floor(len * 0.35)),
            totalTokens: Math.floor(len * 1.4),
            steps: 2,
          });
        }
      } catch { /* handled in route */ }
      finally { setIsStreaming(false); }
    },
    [thread, isStreaming, onMeta],
  );

  const STARTERS = [
    { label: "All Fraud Cases", prompt: "List all active fraud alert cases in TigerGraph with risk scores and exposure." },
    { label: "HHG-010 Dossier", prompt: "Get the full investigation dossier for HHG-010 and show Lekh DSL." },
    { label: "Top Exposure", prompt: "Which cases have the highest financial exposure? Show as a ranked table." },
    { label: "Lekh DSL — HHG-003", prompt: "Export case HHG-003 in Lekh DSL: [CONTEXT] [CASE] [NODE] [EDGE] [REVIEW] [REPORT]." },
  ];

  const isEmpty = thread.messages.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto scroll-smooth px-4 py-4 space-y-5">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-red-600 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-red-900/40">
              MD
            </div>
            <div>
              <p className="text-xl font-bold">MayDay Fraud Intelligence</p>
              <p className="text-sm text-muted-foreground mt-1">
                Gemini 3.8 Flash · TigerGraph · Lekh DSL v1
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
              {STARTERS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => submit(s.prompt)}
                  className="text-left px-3 py-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors text-sm font-medium"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {thread.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start w-full"}`}
          >
            {msg.role === "assistant" && (
              <div className="h-7 w-7 shrink-0 rounded-lg bg-red-600 flex items-center justify-center text-[10px] font-black text-white mt-1">
                MD
              </div>
            )}

            {msg.role === "user" ? (
              <div className="max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                {String(msg.content)}
              </div>
            ) : (
              // Assistant: render OpenUI Lang via Renderer + overflow wrapper
              <div className="flex-1 min-w-0 overflow-x-auto">
                <MessageProvider message={msg}>
                  <Renderer
                    response={String(msg.content || "")}
                    library={shadcnChatLibrary}
                    isStreaming={isStreaming && msg === thread.messages[thread.messages.length - 1]}
                  />
                </MessageProvider>
              </div>
            )}

            {msg.role === "user" && (
              <div className="h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground mt-1">
                U
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex gap-3 justify-start">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-red-600 flex items-center justify-center text-[10px] font-black text-white mt-1">
              MD
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border/50">
              <Brain className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
              <span className="text-xs text-muted-foreground">Gemini thinking…</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border bg-card/60 backdrop-blur px-4 py-3">
        <div className="flex gap-2 items-end max-w-5xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query TigerGraph, get Lekh DSL, investigate a case…"
            className="min-h-[44px] max-h-36 resize-none bg-background border-border/60 text-sm focus-visible:ring-1 focus-visible:ring-primary"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
          />
          <Button
            size="icon"
            disabled={isStreaming || !input.trim()}
            onClick={() => submit(input)}
            className="h-11 w-11 shrink-0 bg-red-600 hover:bg-red-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/40 mt-1.5">
          Enter · Shift+Enter for newline · Powered by Gemini 3.8 Flash
        </p>
      </div>
    </div>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────
export default function Page() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [healthy, setHealthy] = useState(true);
  const [meta, setMeta] = useState<ThinkingMeta>({ thinkingTokens: 0, totalTokens: 0, steps: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.classList.add("dark");
  }, []);

  const refresh = async () => {
    try {
      const [hRes, cRes] = await Promise.all([
        fetch("http://localhost:8000/health", { cache: "no-store" }),
        fetch("http://localhost:8000/api/cases", { cache: "no-store" }),
      ]);
      setHealthy(hRes.ok);
      if (cRes.ok) setCases(await cRes.json());
    } catch { setHealthy(false); }
  };

  useEffect(() => { refresh(); }, []);

  const upload = async (file: File) => {
    setUploadStatus("Ingesting…");
    try {
      const fd = new FormData();
      fd.append("transactions", file);
      const res = await fetch("http://localhost:8000/api/upload_csv", { method: "POST", body: fd });
      if (!res.ok) throw new Error(res.statusText);
      const r = await res.json();
      setUploadStatus(`✓ ${r.message}`);
      await refresh();
    } catch (e: any) { setUploadStatus(`✗ ${e.message}`); }
  };

  const llm = useMemo(
    () => fetchLLM({
      url: "/api/chat",
      streamAdapter: openAIAdapter(),
      messageFormat: openAIMessageFormat,
    }),
    [],
  );

  return (
    <div className="dark flex h-screen w-screen bg-background text-foreground overflow-hidden">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-border bg-card h-full">
        {/* Brand */}
        <div className="px-3 py-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 shrink-0 rounded bg-red-600 flex items-center justify-center text-[10px] font-black text-white">
              MD
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-none truncate">MayDay AI</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 truncate">TigerGraph · Gemini 3.8 Flash</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-[9px] px-1.5 gap-1 ${healthy ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-400" : "border-red-800/60 bg-red-950/30 text-red-400"}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            {healthy ? "Live" : "Down"}
          </Badge>
        </div>

        {/* Thinking tokens — only shown after first response */}
        {meta.totalTokens > 0 && (
          <div className="px-3 py-2 border-b border-border bg-violet-950/20 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Brain className="h-3 w-3 text-violet-400" />
              <span className="text-[10px] text-violet-300 font-medium tabular-nums">
                {meta.thinkingTokens.toLocaleString()} thinking
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {meta.totalTokens.toLocaleString()} total
              </span>
            </div>
          </div>
        )}

        {/* CSV drop */}
        <div className="p-2.5 border-b border-border">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) upload(e.target.files[0]); }} />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) upload(e.dataTransfer.files[0]); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className={`border border-dashed rounded-md py-2.5 text-center cursor-pointer transition-colors ${dragActive ? "border-primary/70 bg-primary/5" : "border-border/60 hover:border-primary/40"}`}
          >
            <UploadCloud className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground">Drop CSV → TigerGraph auto-graphs</p>
          </div>
          {uploadStatus && (
            <p className={`mt-1.5 text-[10px] font-mono px-2 py-1 rounded border ${uploadStatus.startsWith("✓") ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300" : "bg-red-950/30 border-red-800/40 text-red-300"}`}>
              {uploadStatus}
            </p>
          )}
        </div>

        {/* Cases list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ShieldAlert className="h-2.5 w-2.5" /> Alerts ({cases.length})
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={refresh}>
              <RefreshCw className="h-2.5 w-2.5 text-muted-foreground" />
            </Button>
          </div>
          <div className="px-2 pb-2 space-y-0.5">
            {cases.length === 0
              ? <p className="text-[10px] text-muted-foreground text-center py-4">No cases — drop a CSV above</p>
              : cases.map((c) => (
                  <div key={c.case_id}
                    className="rounded-md px-2 py-1.5 border border-border/40 bg-card hover:bg-muted/20 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold">{c.case_id}</span>
                      <Badge variant="secondary"
                        className={`text-[9px] px-1 py-0 h-4 ${c.risk_score > 0.7 ? "bg-red-950/60 text-red-400 border-red-800/40 border" : "bg-amber-950/60 text-amber-400 border-amber-800/40 border"}`}>
                        {(c.risk_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">{c.trigger_text || c.verdict}</p>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border flex items-center justify-between text-[9px] text-muted-foreground">
          <span className="font-mono">Lekh DSL v1</span>
          <span>OpenUI · shadcn</span>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-11 shrink-0 border-b border-border bg-card/50 backdrop-blur flex items-center px-5 justify-between">
          <span className="text-sm font-semibold tracking-tight">MayDay // Fraud Intelligence Cockpit</span>
          <div className="flex items-center gap-2">
            {meta.thinkingTokens > 0 && (
              <Badge variant="secondary"
                className="text-[10px] border border-violet-800/40 bg-violet-950/30 text-violet-300 font-mono gap-1">
                <Brain className="h-2.5 w-2.5" />
                {meta.thinkingTokens.toLocaleString()} thinking tokens
              </Badge>
            )}
            <Badge variant="secondary"
              className="text-[10px] border border-border/60 bg-muted/40 text-muted-foreground font-mono">
              gemini-3.8-flash · Vertex AI
            </Badge>
          </div>
        </header>

        {/* Headless chat — no built-in thread panel chrome */}
        <div className="flex-1 overflow-hidden min-w-0">
          <ChatProvider llm={llm}>
            <MayDayChatUI onMeta={setMeta} />
          </ChatProvider>
        </div>
      </main>
    </div>
  );
}
