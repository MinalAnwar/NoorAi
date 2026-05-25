"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRagChat } from "@/hooks/use-rag-chat";
import { SearchBar } from "./search-bar";
import { CitationCard } from "./citation-card";
import { Skeleton } from "../ui/skeleton";
import { Message, Citation } from "@/types";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, RefreshCw, Trash2, ArrowUpRight, Compass, HelpCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const quickPrompts = [
  { label: "Patience (Sabr)", query: "What are the blessings and rewards of practicing Sabr (patience) according to Quran and Hadith?" },
  { label: "Power of Intentions", query: "Show me authentic Hadiths about actions being judged by intentions and how to purify my intentions." },
  { label: "Understanding Ayat al-Kursi", query: "What is the status and description of Ayat al-Kursi (2:255)?" },
  { label: "Charity (Zakat)", query: "Explain what the Quran says about charity removing sins and purifying wealth." },
];

interface ChatInterfaceProps {
  initialQuery?: string;
  onQueryProcessed?: () => void;
}

export function ChatInterface({ initialQuery, onQueryProcessed }: ChatInterfaceProps = {}) {
  const [sourceFocus, setSourceFocus] = useState<"all" | "quran" | "hadith">("all");
  const { messages, isLoading, error, sendMessage, clearChat } = useRagChat({
    focusSource: sourceFocus,
  });

  // Handle trigger search requests from the landing page hero input
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      sendMessage(initialQuery);
      if (onQueryProcessed) onQueryProcessed();
    }
  }, [initialQuery, sendMessage, onQueryProcessed]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const activeMessage = messages[messages.length - 1];
  const activeCitations = activeMessage?.citations || [];

  // Auto-scroll only the chat container
  useEffect(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    if (isNearBottom || isLoading) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handlePromptClick = (query: string) => {
    sendMessage(query);
  };

  const showCitationsStrip =
    activeCitations.length > 0 ||
    (isLoading && messages.length > 0 && activeCitations.length === 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-4">

      {/* ── Header Controls: Filters & Actions ── */}
      <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-950/40 border border-emerald-900/30 flex items-center justify-center text-emerald-400">
            <BookOpen className="h-5 w-5 stroke-[1.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-100">Noor AI Grounded Core</h2>
            <p className="text-xs text-zinc-500 font-medium">Verify theological contexts securely with RAG</p>
          </div>
        </div>

        {/* Source Focus Controls & Clear */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center p-1 rounded-xl bg-zinc-950/60 border border-zinc-800">
            {(["all", "quran", "hadith"] as const).map((src) => (
              <button
                key={src}
                onClick={() => setSourceFocus(src)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer",
                  sourceFocus === src
                    ? "bg-emerald-600/90 text-emerald-50 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {src === "all" ? "All Sources" : src.charAt(0).toUpperCase() + src.slice(1)}
              </button>
            ))}
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/20 text-zinc-400 hover:text-red-400 hover:border-red-950 hover:bg-red-950/10 transition-all cursor-pointer"
              title="Clear Thread"
            >
              <Trash2 className="h-4 w-4 stroke-[1.5]" />
            </button>
          )}
        </div>
      </div>

      {/* ── CHAT BOX — grows to show all content, page scrolls ── */}
      <div className="flex flex-col h-[70vh] bg-zinc-950/20 border border-zinc-900/60 rounded-3xl overflow-hidden shadow-2xl shadow-black/20">

        {/* Message area — grows naturally, no internal scroll clip */}
        <div
          ref={chatContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-8 md:p-10 flex flex-col gap-6 scrollbar-thin"
        >
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-center items-center py-8 text-center max-w-md mx-auto my-auto gap-6"
              >
                <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg relative group">
                  <Compass className="h-6 w-6 text-zinc-400 group-hover:rotate-45 transition duration-500 stroke-[1.5]" />
                  <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-md -z-10 animate-pulse" />
                </div>

                <div>
                  <h3 className="text-lg md:text-xl font-bold text-zinc-200 tracking-tight">Begin Grounded Query</h3>
                  <p className="text-base text-zinc-400 leading-relaxed mt-2 max-w-[42ch]">
                    Enter a query related to Islamic theology, rulings, or history. Noor AI will retrieval-ground your answer using authentic sources.
                  </p>
                </div>

                {/* Quick Prompt templates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full pt-4">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(prompt.query)}
                      className="p-4 bg-zinc-950/50 border border-zinc-900 hover:border-emerald-500/20 rounded-xl text-left text-sm font-semibold text-zinc-300 hover:text-zinc-100 transition-all flex items-start justify-between group shadow-sm cursor-pointer"
                    >
                      <span className="max-w-[85%] leading-relaxed">{prompt.label}</span>
                      <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition duration-300" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Message bubbles */
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "flex flex-col gap-2 max-w-[88%] rounded-2xl p-6 md:p-8 font-sans relative",
                    msg.role === "user"
                      ? "self-end bg-emerald-600/10 border border-emerald-500/20 text-zinc-100 rounded-tr-none"
                      : "self-start bg-zinc-900/40 border border-zinc-800 text-zinc-200 rounded-tl-none shadow-md"
                  )}
                >
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold">
                    {msg.role === "user" ? "Grounded Query" : "Noor AI Synthesis"}
                  </span>

                  <div className="text-base md:text-[1.05rem] leading-relaxed select-text text-zinc-200 prose-invert max-w-none">
                    {msg.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                          li: ({ node, ...props }) => <li {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold text-emerald-400" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-emerald-500" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 mt-5 text-emerald-500" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2 mt-4 text-emerald-500" {...props} />,
                          code: ({ node, ...props }) => (
                            <code className="bg-zinc-950/50 text-emerald-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="space-y-3 py-1">
                        <Skeleton className="h-5 w-[90%]" />
                        <Skeleton className="h-5 w-[75%]" />
                        <Skeleton className="h-5 w-[85%]" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Search bar — pinned to the bottom of the chat box */}
        <div className="shrink-0 px-6 md:px-10 py-4 border-t border-zinc-900/60 bg-zinc-950/10">
          <SearchBar onSearch={sendMessage} isLoading={isLoading} />
        </div>
      </div>

      {/* ── CITATIONS STRIP — horizontal scroll row, only shown when relevant ── */}
      <AnimatePresence>
        {showCitationsStrip && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="shrink-0 flex flex-col gap-2"
          >
            {/* Strip header */}
            <div className="flex items-center gap-2.5 px-1">
              <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
              <h3 className="text-sm font-bold text-zinc-300 tracking-tight">Grounded Citations</h3>
              {activeCitations.length > 0 && (
                <span className="text-[10px] font-bold font-mono bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full uppercase shrink-0">
                  {activeCitations.length} sources
                </span>
              )}
            </div>

            {/* Horizontal scroll track — fixed height so it never crushes the chat box */}
            <div
              id="citations-scroll-container"
              className="flex flex-row gap-3 overflow-x-auto overflow-y-hidden h-72 pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {isLoading && activeCitations.length === 0 ? (
                /* Loading skeleton cards */
                [0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="shrink-0 w-60 h-full border border-zinc-900 p-4 rounded-2xl space-y-3 bg-zinc-950/30"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))
              ) : (
                activeCitations.map((source, idx) => (
                  <CitationCard key={source.id} result={source as any} index={idx} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
