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

  // Safely auto-scroll only the chat container, without scrolling the main page
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Only auto-scroll if the user is already near the bottom, or if a new request just started
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    if (isNearBottom || isLoading) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handlePromptClick = (query: string) => {
    sendMessage(query);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-6 md:gap-8 h-[calc(100dvh-64px)]">
      
      {/* Header Controls: Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-950/40 border border-emerald-900/30 flex items-center justify-center text-emerald-400">
            <BookOpen className="h-5 w-5 stroke-[1.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-100">Noor AI Grounded Core</h2>
            <p className="text-xs text-zinc-500 font-medium">Verify theological contexts securely with RAG</p>
          </div>
        </div>

        {/* Source Focus Controls & Trash Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center p-1 rounded-xl bg-zinc-950/60 border border-zinc-850">
            <button
              onClick={() => setSourceFocus("all")}
              className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer", {
                "bg-emerald-600/90 text-emerald-50 shadow-sm": sourceFocus === "all",
                "text-zinc-500 hover:text-zinc-300": sourceFocus !== "all",
              })}
            >
              All Sources
            </button>
            <button
              onClick={() => setSourceFocus("quran")}
              className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer", {
                "bg-emerald-600/90 text-emerald-50 shadow-sm": sourceFocus === "quran",
                "text-zinc-500 hover:text-zinc-300": sourceFocus !== "quran",
              })}
            >
              Quran
            </button>
            <button
              onClick={() => setSourceFocus("hadith")}
              className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer", {
                "bg-emerald-600/90 text-emerald-50 shadow-sm": sourceFocus === "hadith",
                "text-zinc-500 hover:text-zinc-300": sourceFocus !== "hadith",
              })}
            >
              Hadith
            </button>
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/20 text-zinc-400 hover:text-red-400 hover:border-red-950 hover:bg-red-950/10 transition-all cursor-pointer"
              title="Clear Thread"
            >
              <Trash2 className="h-4.5 w-4.5 stroke-[1.5]" />
            </button>
          )}
        </div>
      </div>

      {/* RAG Workspace Layout: Asymmetric Split Screen */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: Conversational Interface (8 Columns on Large, 12 on Mobile) */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-zinc-950/20 border border-zinc-900/60 rounded-3xl overflow-hidden relative p-4 md:p-6 shadow-2xl shadow-black/20">
          
          {/* Scrollable Conversation Container */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6 scrollbar-thin">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                // Beautiful dynamic Empty State with grid/guides
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

                  {/* Staggered Prompt templates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full pt-4">
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePromptClick(prompt.query)}
                        className="p-4 bg-zinc-950/50 border border-zinc-900 hover:border-emerald-500/20 rounded-xl text-left text-sm font-semibold text-zinc-300 hover:text-zinc-100 transition-all flex items-start justify-between group shadow-sm hover:shadow-emerald-950/5 cursor-pointer animate-[fadeIn_0.5s_ease-out]"
                      >
                        <span className="max-w-[85%] leading-relaxed">{prompt.label}</span>
                        <ArrowUpRight className="h-4 w-4 text-zinc-650 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition duration-300" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                // Message List Reveal
                messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn("flex flex-col gap-2 max-w-[88%] rounded-2xl p-5.5 font-sans relative", {
                      "self-end bg-emerald-600/10 border border-emerald-500/20 text-zinc-100 rounded-tr-none":
                        msg.role === "user",
                      "self-start bg-zinc-900/40 border border-zinc-850 text-zinc-200 rounded-tl-none shadow-md":
                        msg.role === "assistant",
                    })}
                  >
                    {/* Role header label */}
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold">
                      {msg.role === "user" ? "Grounded Query" : "Noor AI Synthesis"}
                    </span>

                    {/* Content render - handling markdown paragraphs */}
                    <div className="text-base md:text-lg leading-relaxed space-y-4 whitespace-pre-wrap select-text pr-1 text-zinc-200">
                      {msg.content ? (
                        msg.content.split("\n\n").map((para, pIdx) => (
                          <p key={pIdx}>{para}</p>
                        ))
                      ) : (
                        // Skeletal tokens when streaming just started
                        <div className="space-y-3 py-1">
                          <Skeleton className="h-5.5 w-[90%]" />
                          <Skeleton className="h-5.5 w-[75%]" />
                          <Skeleton className="h-5.5 w-[85%]" />
                        </div>
                      )}
                    </div>

                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* RAG search query triggers */}
          <div className="pt-4 border-t border-zinc-900/60 bg-zinc-950/10">
            <SearchBar onSearch={sendMessage} isLoading={isLoading} />
          </div>
        </div>

        {/* RIGHT COLUMN: Grounded Context Citation Panel (4 Columns on Large, 12 on Mobile) */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-zinc-950/10 border border-zinc-900/40 rounded-3xl overflow-hidden relative shadow-md p-4 md:p-6">
          
          <div className="flex items-center justify-between border-b border-zinc-800/30 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
              <h3 className="text-sm font-bold text-zinc-200 tracking-tight">Grounded Database Citations</h3>
            </div>
            {activeCitations.length > 0 && (
              <span className="text-[10px] font-bold font-mono bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full uppercase">
                {activeCitations.length} Citations
              </span>
            )}
          </div>

          <div id="citations-scroll-container" className="flex-1 overflow-y-auto flex flex-col gap-4 scrollbar-thin">
            {isLoading && activeCitations.length === 0 ? (
              // Structured shimmers for cards during initial RAG fetch
              <div className="flex flex-col gap-4">
                <div className="border border-zinc-900 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="border border-zinc-900 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ) : activeCitations.length > 0 ? (
              // Render list of verified sources
              activeCitations.map((source, idx) => (
                <CitationCard key={source.id} result={source as any} index={idx} />
              ))
            ) : (
              // Empty Citations state
              <div className="flex-1 flex flex-col justify-center items-center text-center my-auto py-8 max-w-[28ch] mx-auto gap-4">
                <HelpCircle className="h-10 w-10 text-zinc-800 stroke-[1.5]" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400">Context Panel Empty</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed mt-1">
                    Citations, translations, and authentic grades will occupy this panel once you submit a grounded request.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
