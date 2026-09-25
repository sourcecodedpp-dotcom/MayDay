"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  Trash2,
  Pencil,
  Settings,
  Send,
  Sparkles,
  User,
  PanelLeft,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Search,
  X,
  Database,
  Cpu,
  RefreshCw,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import {
  ChatProvider,
  fetchLLM,
  restStorage,
  useThread,
  useThreadList,
  openAIAdapter,
  openAIResponsesAdapter,
  openAIReadableStreamAdapter,
  vercelAIAdapter,
  agUIAdapter,
  openAIMessageFormat,
  openAIConversationMessageFormat,
  vercelAIMessageFormat,
  identityMessageFormat,
  processStreamedMessage,
  MessageProvider,
  useMessage,
  EventType,
  type ArtifactCategory,
  type ArtifactRendererConfig,
  type ChatLLM,
  type ChatStorage,
  type Message as OpenUIHeadlessMessage,
} from "@openuidev/react-headless";
import { Renderer } from "@openuidev/react-lang";
import { shadcnChatLibrary } from "@/lib/shadcn-genui";
import { PromptInput } from "@/components/ui/ai-chat-input";

const maydayHeadlessLLM: ChatLLM = fetchLLM({
  url: "/api/chat",
  streamAdapter: agUIAdapter(),
  messageFormat: identityMessageFormat,
});

export const maydayHeadlessAdapters = {
  fetchLLM,
  restStorage,
  useThread,
  useThreadList,
  useMessage,
  openAIAdapter,
  openAIResponsesAdapter,
  openAIReadableStreamAdapter,
  vercelAIAdapter,
  agUIAdapter,
  openAIMessageFormat,
  openAIConversationMessageFormat,
  vercelAIMessageFormat,
  identityMessageFormat,
  processStreamedMessage,
  EventType,
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  modelUsed?: string;
  quickActions?: string[];
  attachments?: string[];
  durationLabel?: string;
  isStreaming?: boolean;
  openuiLang?: string;
}

interface Conversation {
  id: string;
  title: string;
  timestampLabel: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    title: "Pull Files From Git",
    timestampLabel: "now",
    updatedAt: 1727240000000,
    messages: [
      {
        id: "m-1-1",
        role: "user",
        content: "pull all files from git",
        timestamp: 1727239940000,
      },
      {
        id: "m-1-2",
        role: "assistant",
        content: "### Git Synchronization Complete\n\nAll files from `origin/main` are pulled and working tree is clean.\n\n- **Branch**: `main`\n- **Remote**: `https://github.com/sourcecodedpp-dotcom/MayDay.git`\n- **Status**: Everything is up to date.",
        timestamp: 1727239950000,
        modelUsed: "TigerGraph MCP Engine",
        durationLabel: "Worked for 1.4s",
        quickActions: ["List active fraud cases", "Investigate HHG-001", "Show High Exposure Cases"],
      },
    ],
  },
  {
    id: "conv-2",
    title: "backend",
    timestampLabel: "16h",
    updatedAt: 1727180000000,
    messages: [
      {
        id: "m-2-1",
        role: "user",
        content: "start the dev backend server",
        timestamp: 1727180000000,
      },
      {
        id: "m-2-2",
        role: "assistant",
        content: "FastAPI server running on `http://localhost:8000` with TigerGraph MCP tools active.",
        timestamp: 1727180002000,
        durationLabel: "Worked for 850ms",
      },
    ],
  },
  {
    id: "conv-3",
    title: "Organize Project Folder",
    timestampLabel: "2d",
    updatedAt: 1727060000000,
    messages: [
      {
        id: "m-3-1",
        role: "user",
        content: "organize project folder structure",
        timestamp: 1727060000000,
      },
      {
        id: "m-3-2",
        role: "assistant",
        content: "Project structure organized into `/backend`, `/real-shadcn-app`, and `/cases`.",
        timestamp: 1727060002000,
        durationLabel: "Worked for 2.1s",
      },
    ],
  },
];

const HERO_TAGLINES = [
  "What broke this time?",
  "Give me a fraud case. I’ll make it everyone’s problem.",
  "Something looks suspicious. Obviously.",
  "Drop the case. We’ll follow the rabbit hole.",
  "Because manually investigating 590,000 transactions sounded fun.",
  "Tell me what happened. I’ll find what actually happened.",
  "Another perfectly normal transaction? Sure.",
  "Start an investigation. Ruin someone’s afternoon.",
  "Show me the signal. I’ll find the connections.",
  "Something doesn’t add up. Good.",
  "Give me a card. I’ll find its friends.",
  "Fraud rarely travels alone. Neither do we.",
  "Let’s see how deep this goes.",
  "One suspicious transaction. Several bad decisions.",
  "The data knows. It’s just terrible at explaining itself.",
  "Drop a case. Mayday from there.",
  "Find the signal hiding in the noise.",
  "Someone said it was “just one transaction.”",
  "Your fraud case is probably more interesting than you think.",
  "Go ahead. Give me something suspicious.",
];

export default function CockpitPage() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string>("conv-1");

  // Navigation History Stack
  const [navHistory, setNavHistory] = useState<string[]>(["conv-1"]);
  const [navIndex, setNavIndex] = useState<number>(0);

  // UI state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [liveElapsedMs, setLiveElapsedMs] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Hero Tagline Animation State
  const [taglineIndex, setTaglineIndex] = useState<number>(0);
  const [taglinePhase, setTaglinePhase] = useState<"visible" | "exiting" | "entering">("visible");

  // Cycle tagline with smooth blur + vertical slide transition
  const cycleNextTagline = useCallback(() => {
    setTaglinePhase("exiting");
    setTimeout(() => {
      setTaglineIndex((prev) => (prev + 1) % HERO_TAGLINES.length);
      setTaglinePhase("entering");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTaglinePhase("visible");
        });
      });
    }, 420);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      cycleNextTagline();
    }, 4400);
    return () => clearInterval(interval);
  }, [cycleNextTagline]);

  // Search filter
  const [searchFilter, setSearchFilter] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Inline rename
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Settings Modal
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const activeStreamTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real live timer while thinking/querying
  useEffect(() => {
    if (!isSending) {
      setLiveElapsedMs(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      setLiveElapsedMs(Date.now() - start);
    }, 80);
    return () => clearInterval(timer);
  }, [isSending]);

  // Clean up streaming timer on unmount
  useEffect(() => {
    return () => {
      if (activeStreamTimerRef.current) {
        clearInterval(activeStreamTimerRef.current);
      }
    };
  }, []);

  // Safe client hydration
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedConvs = localStorage.getItem("mayday_conversations_v3");
      if (savedConvs) {
        const parsed = JSON.parse(savedConvs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setActiveConversationId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load local state", e);
    }
  }, []);

  // Save changes to localStorage ONLY when not actively streaming (prevents 60fps JSON.stringify lag)
  useEffect(() => {
    if (!isMounted) return;
    const anyStreaming = conversations.some((c) =>
      c.messages.some((m) => m.isStreaming)
    );
    if (anyStreaming) return;
    try {
      localStorage.setItem("mayday_conversations_v3", JSON.stringify(conversations));
    } catch (e) {
      console.error("Failed to save state", e);
    }
  }, [conversations, isMounted]);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const scrollToBottom = useCallback((instant = false) => {
    const el = scrollContainerRef.current;
    if (el) {
      if (instant) {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? "auto" : "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages?.length, scrollToBottom]);

  // Navigate to conversation with history
  const navigateTo = (convId: string) => {
    if (convId === activeConversationId) return;
    setActiveConversationId(convId);
    setNavHistory((prev) => {
      const next = prev.slice(0, navIndex + 1);
      return [...next, convId];
    });
    setNavIndex((prev) => prev + 1);
  };

  const handleNavBack = () => {
    if (navIndex > 0) {
      const prevId = navHistory[navIndex - 1];
      setActiveConversationId(prevId);
      setNavIndex(navIndex - 1);
    }
  };

  const handleNavForward = () => {
    if (navIndex < navHistory.length - 1) {
      const nextId = navHistory[navIndex + 1];
      setActiveConversationId(nextId);
      setNavIndex(navIndex + 1);
    }
  };

  // Smart New Conversation Logic (No duplicate empties)
  const handleNewConversation = () => {
    if (
      activeConversation &&
      activeConversation.messages.length === 0 &&
      activeConversation.title === "New Conversation"
    ) {
      textareaRef.current?.focus();
      return;
    }

    const newId = `conv-${Date.now()}`;
    const newConvo: Conversation = {
      id: newId,
      title: "New Conversation",
      timestampLabel: "now",
      updatedAt: Date.now(),
      messages: [],
    };

    setConversations((prev) => [newConvo, ...prev]);
    navigateTo(newId);
    setInput("");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Chat Delete Logic
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const fresh: Conversation = {
          id: `conv-${Date.now()}`,
          title: "New Conversation",
          timestampLabel: "now",
          updatedAt: Date.now(),
          messages: [],
        };
        navigateTo(fresh.id);
        return [fresh];
      }
      if (activeConversationId === id) {
        navigateTo(filtered[0].id);
      }
      return filtered;
    });
  };

  // Inline Rename Logic
  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: editingTitle.trim() } : c))
      );
    }
    setEditingConvId(null);
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Send message with live timing and progressive smooth streaming
  const handleSendMessage = async (
    textToSend?: string,
    meta?: { mode?: string; attachments?: File[] }
  ) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    const hasFiles = meta?.attachments && meta.attachments.length > 0;
    if ((!text && !hasFiles) || isSending) return;

    // Clear any previous active stream
    if (activeStreamTimerRef.current) {
      clearInterval(activeStreamTimerRef.current);
      activeStreamTimerRef.current = null;
    }

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsSending(true);

    const startTime = Date.now();
    const datasetNames =
      meta?.attachments?.map((f) => f.name) || [];

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text || `Uploaded dataset: ${datasetNames.join(", ")}`,
      timestamp: Date.now(),
      attachments: datasetNames,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          const isFirst = c.messages.length === 0 || c.title === "New Conversation";
          const newTitle = isFirst
            ? text.length > 28
              ? text.slice(0, 28) + "..."
              : text || datasetNames[0] || "Dataset Upload"
            : c.title;

          return {
            ...c,
            title: newTitle,
            timestampLabel: "now",
            updatedAt: Date.now(),
            messages: [...c.messages, userMsg],
          };
        }
        return c;
      })
    );

    try {
      let uploadNote = "";
      if (meta?.attachments && meta.attachments.length > 0) {
        const csvFiles = meta.attachments.filter((f) =>
          f.name.toLowerCase().endsWith(".csv")
        );
        if (csvFiles.length > 0) {
          try {
            const formData = new FormData();
            formData.append("transactions", csvFiles[0]);
            if (csvFiles[1]) {
              formData.append("identity", csvFiles[1]);
            }
            const upRes = await fetch("http://localhost:8000/api/upload_csv", {
              method: "POST",
              body: formData,
            });
            if (upRes.ok) {
              const upJson = await upRes.json();
              uploadNote = ` (${upJson.message || "Dataset ingested into TigerGraph"})`;
            }
          } catch (upErr) {
            console.warn("Dataset ingestion warning:", upErr);
          }
        }
      }

      const effectivePrompt =
        datasetNames.length > 0
          ? `${text ? text + " — " : ""}Analyze uploaded dataset(s): ${datasetNames.join(", ")}${uploadNote}. List active fraud cases.`
          : text;

      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: effectivePrompt, session_id: activeConversationId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const elapsedMs = Date.now() - startTime;
      const durationLabel =
        elapsedMs >= 1000
          ? `Worked for ${(elapsedMs / 1000).toFixed(1)}s`
          : `Worked for ${Math.max(100, elapsedMs)}ms`;

      const fullReply = data.reply || "Analysis completed.";
      const assistantId = `msg-${Date.now() + 1}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        modelUsed: data.model_used || "TigerGraph MCP Engine",
        quickActions: data.quick_actions || [],
        durationLabel,
        isStreaming: true,
        openuiLang: data.openui_lang || undefined,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: [...c.messages, assistantMsg] }
            : c
        )
      );

      setIsSending(false);

      // Token-aware smooth streaming (never splits backticks, bold, or table rows)
      const lines = fullReply.split("\n");
      const snapshots: string[] = [];
      let acc = "";
      for (const line of lines) {
        if (line.trim().startsWith("|") || line.trim().startsWith("#")) {
          // Reveal table rows and headings as whole atomic lines to prevent layout jitter
          acc += (acc ? "\n" : "") + line;
          snapshots.push(acc);
        } else {
          // Reveal prose in smooth 3-word token groups keeping inline code/bold intact
          const tokens = line.match(/`[^`]*`|\*\*[^*]*\*\*|\S+\s*/g) || [line];
          let lineAcc = acc ? acc + "\n" : "";
          for (let i = 0; i < tokens.length; i += 3) {
            lineAcc += tokens.slice(i, i + 3).join("");
            snapshots.push(lineAcc);
          }
          acc = lineAcc;
        }
      }
      if (snapshots.length === 0 || snapshots[snapshots.length - 1] !== fullReply) {
        snapshots.push(fullReply);
      }

      let stepIdx = 0;
      activeStreamTimerRef.current = setInterval(() => {
        if (stepIdx >= snapshots.length - 1) {
          if (activeStreamTimerRef.current) {
            clearInterval(activeStreamTimerRef.current);
            activeStreamTimerRef.current = null;
          }
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: fullReply, isStreaming: false }
                        : m
                    ),
                  }
                : c
            )
          );
        } else {
          const nextContent = snapshots[stepIdx];
          stepIdx += 1;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId ? { ...m, content: nextContent } : m
                    ),
                  }
                : c
            )
          );
        }
        requestAnimationFrame(() => scrollToBottom(true));
      }, 28);
    } catch (err: any) {
      const elapsedMs = Date.now() - startTime;
      const durationLabel =
        elapsedMs >= 1000
          ? `Worked for ${(elapsedMs / 1000).toFixed(1)}s`
          : `Worked for ${Math.max(100, elapsedMs)}ms`;

      const errorContent = `### System Notice\n\nBackend service unavailable: **${err.message}**.\nPlease ensure \`uvicorn backend.app:app --port 8000\` is active.`;
      const assistantId = `msg-${Date.now() + 1}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: errorContent,
        timestamp: Date.now(),
        modelUsed: "Offline Diagnostic",
        durationLabel,
        isStreaming: false,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: [...c.messages, assistantMsg] }
            : c
        )
      );
      setIsSending(false);
    } finally {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if ((e.nativeEvent as any)?.isComposing) return;
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      c.messages.some((m) => m.content.toLowerCase().includes(term))
    );
  });

  return (
    <ChatProvider llm={maydayHeadlessLLM}>
      <div
        suppressHydrationWarning
        className="flex h-screen w-screen bg-[#0d0d0f] text-[#ededef] font-sans antialiased overflow-hidden select-none"
      >
      {/* ─── SIDEBAR (Functional Cursor/Antigravity Architecture) ──────── */}
      <aside
        className={`shrink-0 flex flex-col bg-[#111114] border-r border-[#222226] h-full text-[12.5px] transition-all duration-200 ease-in-out ${
          isSidebarCollapsed ? "w-0 overflow-hidden border-r-0" : "w-[260px]"
        }`}
      >
        {/* Top Controls: Collapse & History Navigation */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1 select-none">
          <div className="flex items-center gap-1 text-zinc-400">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="w-6 h-6 rounded border border-white/10 flex items-center justify-center hover:text-white hover:bg-white/5 transition"
              title="Close Sidebar"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNavBack}
              disabled={navIndex <= 0}
              className="w-6 h-6 flex items-center justify-center hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition"
              title="Previous Conversation"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNavForward}
              disabled={navIndex >= navHistory.length - 1}
              className="w-6 h-6 flex items-center justify-center hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition"
              title="Next Conversation"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className={`w-6 h-6 rounded flex items-center justify-center transition ${
              showSearch ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
            title="Search Conversations"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* + New Conversation Button */}
        <div className="px-3 py-2">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.08] bg-[#1a1a1f] hover:bg-[#24242b] text-zinc-100 text-[13px] font-medium tracking-tight transition shadow-sm active:scale-[0.99]"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-300" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Search Bar (Toggled by Search Icon) */}
        {showSearch && (
          <div className="px-3 pb-2 animate-in fade-in duration-150">
            <div className="relative flex items-center bg-[#18181d] border border-white/10 rounded-md px-2 py-1">
              <Search className="w-3 h-3 text-zinc-400 shrink-0 mr-1.5" />
              <input
                ref={searchInputRef}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search history..."
                className="w-full bg-transparent border-0 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
              />
              {searchFilter && (
                <button onClick={() => setSearchFilter("")} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Conversation History Header */}
        <div className="flex items-center justify-between px-3.5 pt-2 pb-1 text-[11px] font-semibold text-zinc-500 tracking-wider select-none">
          <span>RECENT</span>
          <span className="text-[10px] text-zinc-600 font-mono">
            {conversations.length}
          </span>
        </div>

        {/* Scrollable Conversation History List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5 custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-zinc-500 italic">
              {searchFilter ? "No conversations match search" : "No conversation history yet"}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = editingConvId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => navigateTo(conv.id)}
                  onDoubleClick={(e) => handleStartRename(conv, e)}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                    isActive
                      ? "bg-[#25252c] text-white font-medium shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  {isEditing ? (
                    <input
                      ref={renameInputRef}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleSaveRename(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(conv.id);
                        if (e.key === "Escape") setEditingConvId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-[#18181d] border border-white/20 text-xs text-white rounded px-1.5 py-0.5 focus:outline-none"
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2 truncate pr-2">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate text-xs">{conv.title}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Timestamp label */}
                        <span className="text-[10px] text-zinc-500 font-mono group-hover:hidden">
                          {conv.timestampLabel}
                        </span>

                        {/* Rename Button */}
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(conv, e)}
                          className="hidden group-hover:flex items-center justify-center w-4 h-4 rounded text-zinc-400 hover:text-white transition"
                          title="Rename conversation"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="hidden group-hover:flex items-center justify-center w-4 h-4 rounded text-zinc-400 hover:text-red-400 transition"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Settings */}
        <div className="p-3 border-t border-white/[0.06] mt-auto">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-xs transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CHAT CANVAS ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0d0f] relative">
        {/* Expand button if sidebar is collapsed */}
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="absolute top-3 left-3 z-30 p-2 rounded-lg bg-[#141418] border border-white/10 text-zinc-400 hover:text-white transition shadow-lg"
            title="Open Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        {/* Messages Scroll Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar"
        >
          {!activeConversation || activeConversation.messages.length === 0 ? (
            /* Clean Center AI Input Screen with Smooth Rotating Tagline */
            <div className="h-full flex flex-col items-center justify-center w-full select-none">
              {/* Animated Tagline Stage above Input Bar */}
              <div
                onClick={cycleNextTagline}
                title="Click for next prompt idea"
                className="min-h-[48px] mb-5 px-4 max-w-[780px] w-full flex items-center justify-center text-center cursor-pointer overflow-hidden"
              >
                <h2
                  className="text-xl sm:text-[26px] font-medium tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-snug"
                  style={
                    taglinePhase === "visible"
                      ? {
                          opacity: 1,
                          transform: "translateY(0px) scale(1)",
                          filter: "blur(0px)",
                          transition:
                            "opacity 560ms cubic-bezier(0.16, 1, 0.3, 1), transform 560ms cubic-bezier(0.16, 1, 0.3, 1), filter 560ms cubic-bezier(0.16, 1, 0.3, 1)",
                        }
                      : taglinePhase === "exiting"
                        ? {
                            opacity: 0,
                            transform: "translateY(-14px) scale(0.985)",
                            filter: "blur(8px)",
                            transition:
                              "opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 400ms cubic-bezier(0.4, 0, 0.2, 1), filter 400ms cubic-bezier(0.4, 0, 0.2, 1)",
                          }
                        : {
                            opacity: 0,
                            transform: "translateY(14px) scale(0.985)",
                            filter: "blur(8px)",
                            transition: "none",
                          }
                  }
                >
                  {HERO_TAGLINES[taglineIndex]}
                </h2>
              </div>

              <div className="p-4 w-full flex justify-center z-10">
                <PromptInput
                  onSubmit={(val, meta) => handleSendMessage(val, meta)}
                  placeholder="Ask anything..."
                />
              </div>
            </div>
          ) : (
            /* Render Messages Cleanly (Antigravity/Cursor Unboxed Style) */
            <div className="max-w-[780px] mx-auto space-y-7 w-full pb-4">
              {activeConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className="w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                >
                  {msg.role === "user" ? (
                    /* Full-width User Prompt Card (No Avatar) */
                    <div className="w-full bg-[#18181b] border border-white/[0.07] rounded-xl px-4 py-3.5 text-zinc-300 text-[13.5px] leading-relaxed shadow-sm">
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2.5">
                          {msg.attachments.map((fileName, idx) => {
                            const ext =
                              fileName.split(".").pop()?.toUpperCase() || "DATA";
                            return (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#121215] text-xs text-zinc-200"
                              >
                                <span className="px-1.5 py-0.5 rounded bg-[#2b2111] text-[#f5b041] border border-[#f5b041]/25 text-[10px] font-mono font-semibold">
                                  {ext}
                                </span>
                                <span className="font-mono text-zinc-300">
                                  {fileName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    /* Unboxed Assistant Output (No Logo, Worked for Xs Header) */
                    <div className="relative group w-full text-[13.5px] leading-relaxed text-zinc-300">
                      {/* Worked for Xs › Header + Copy Button */}
                      <div className="flex items-center justify-between mb-3 select-none">
                        <div className="flex items-center gap-1 text-[12.5px] text-zinc-500">
                          <span>{msg.durationLabel || "Worked for 1s"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition p-1"
                          title="Copy"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Unboxed Markdown Typography */}
                      <div className="space-y-3 text-zinc-300">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-base font-semibold text-white mt-4 mb-2">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-[15px] font-semibold text-white mt-4 mb-2">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-[14px] font-semibold text-white mt-3 mb-1.5">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="text-[13.5px] leading-relaxed text-zinc-300">
                                {children}
                              </p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-white">
                                {children}
                              </strong>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-5 space-y-1.5 text-zinc-300">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-[13.5px] leading-relaxed text-zinc-300 [&>ul]:list-[circle] [&>ul]:mt-1.5 [&>ul]:space-y-1">
                                {children}
                              </li>
                            ),
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-3.5 rounded-lg border border-white/[0.08] bg-[#121215] shadow-sm">
                                <table className="w-full text-left text-[12.5px] border-collapse min-w-[520px]">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="bg-white/[0.04] border-b border-white/[0.08] text-zinc-400 font-medium text-xs">
                                {children}
                              </thead>
                            ),
                            tbody: ({ children }) => (
                              <tbody className="divide-y divide-white/[0.04]">
                                {children}
                              </tbody>
                            ),
                            tr: ({ children }) => (
                              <tr className="hover:bg-white/[0.02] transition-colors">
                                {children}
                              </tr>
                            ),
                            th: ({ children }) => (
                              <th className="px-3.5 py-2.5 text-xs font-semibold text-zinc-300 whitespace-nowrap">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="px-3.5 py-2 text-zinc-300 font-mono text-[12px] whitespace-nowrap">
                                {children}
                              </td>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-2 border-amber-500/50 pl-3.5 py-1 text-zinc-400 italic my-2">
                                {children}
                              </blockquote>
                            ),
                            hr: () => <hr className="border-white/[0.08] my-4" />,
                            code: ({ className, children, ...props }: any) => {
                              const isBlock = className?.includes("language-");
                              if (isBlock) {
                                return (
                                  <pre className="bg-[#141418] border border-white/[0.08] rounded-xl p-3.5 overflow-x-auto my-2.5 text-xs font-mono text-zinc-200">
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                );
                              }
                              return (
                                <code
                                  className="bg-[#2b2111] text-[#f5b041] border border-[#f5b041]/20 px-1.5 py-0.5 rounded text-[12px] font-mono leading-none inline-block align-middle"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        {/* Streaming cursor */}
                        {msg.isStreaming && (
                          <span className="inline-block w-1.5 h-4 bg-amber-400/90 ml-1 animate-pulse align-middle rounded-[1px]" />
                        )}

                        {/* OpenUI Headless + React-Lang Generative UI Renderer */}
                        {!msg.isStreaming && msg.openuiLang && (
                          <MessageProvider
                            message={
                              {
                                id: msg.id,
                                role: "assistant",
                                content: msg.content,
                              } as OpenUIHeadlessMessage
                            }
                          >
                            <div className="mt-3.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                              <Renderer
                                library={shadcnChatLibrary}
                                response={msg.openuiLang}
                                isStreaming={false}
                              />
                            </div>
                          </MessageProvider>
                        )}
                      </div>

                      {/* Quick Follow-up Buttons (Fade in when stream finishes) */}
                      {!msg.isStreaming && msg.quickActions && msg.quickActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-4 animate-in fade-in-0 duration-300">
                          {msg.quickActions.map((qa) => (
                            <button
                              key={qa}
                              onClick={() => handleSendMessage(qa)}
                              className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition"
                            >
                              {qa}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Unboxed Live Animated Working / Thinking Indicator */}
              {isSending && (
                <div className="flex items-center gap-1.5 text-[12.5px] text-zinc-400 select-none animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                  <span className="text-zinc-300 font-medium">Working...</span>
                  <span className="text-zinc-500 font-mono text-[11.5px]">
                    ({(liveElapsedMs / 1000).toFixed(1)}s)
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ─── FLOATING FREE CHAT INPUT (When Conversation has messages) ──── */}
        {activeConversation && activeConversation.messages.length > 0 && (
          <div className="w-full shrink-0 px-4 pb-6 pt-2 flex justify-center bg-gradient-to-t from-[#0d0d0f] via-[#0d0d0f]/90 to-transparent pointer-events-none">
            <div className="w-full flex justify-center pointer-events-auto">
              <PromptInput
                onSubmit={(val, meta) => handleSendMessage(val, meta)}
                placeholder="Ask anything..."
              />
            </div>
          </div>
        )}

        {/* ─── SETTINGS MODAL ──────────────────────────────────────────── */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-[#141418] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  Cockpit Settings
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-zinc-300">
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] space-y-1">
                  <div className="font-medium text-white flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-red-400" />
                    AI Intelligence Model
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Gemini 3.8 Flash (Vertex AI Model Garden / Google GenAI)
                  </p>
                </div>

                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] space-y-1">
                  <div className="font-medium text-white flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    TigerGraph MCP Server
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Status: <span className="text-emerald-400 font-mono">CONNECTED</span> (Local port 8000)
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (confirm("Clear all conversation history?")) {
                        localStorage.removeItem("mayday_conversations_v3");
                        setConversations([
                          {
                            id: `conv-${Date.now()}`,
                            title: "New Conversation",
                            timestampLabel: "now",
                            updatedAt: Date.now(),
                            messages: [],
                          },
                        ]);
                        setShowSettings(false);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-lg border border-red-500/20 bg-red-950/20 hover:bg-red-950/40 text-red-300 text-xs font-medium transition"
                  >
                    Clear All Conversation History
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
    </ChatProvider>
  );
}
