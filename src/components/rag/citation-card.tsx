"use client";

import React, { useState } from "react";
import { RetrievalResult } from "@/types";
import { cn } from "@/utils/cn";
import { BookOpen, Calendar, CheckCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CitationCardProps {
  result: RetrievalResult;
  index: number;
}

/**
 * Liquid glassmorphic card representing a grounded retrieval citation.
 * Renders Arabic script and English translation with dynamic height expanders.
 */
export function CitationCard({ result, index }: CitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const percentage = Math.round(result.relevance_score * 100);

  // Distinguish color indicator based on match weight
  const isHighMatch = result.relevance_score > 0.7;

  return (
    <motion.div
      id={`citation-card-${result.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 18,
        delay: index * 0.05, // Cascading stagger delays
      }}
      className={cn(
        "shrink-0 glass-panel glass-panel-hover rounded-2xl overflow-hidden transition-all duration-300 w-full flex flex-col group relative"
      )}
    >
      {/* Top Banner: Source Metadata + Relevance Score Gauge */}
      <div 
        className="p-5 flex items-center justify-between border-b border-zinc-800/40 bg-zinc-900/20 cursor-pointer hover:bg-zinc-800/20 transition-colors"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-950/40 border border-emerald-900/30 flex items-center justify-center text-emerald-400">
            {result.type === "quran" ? (
              <BookOpen className="h-4 w-4 stroke-[1.5]" />
            ) : (
              <Calendar className="h-4 w-4 stroke-[1.5]" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-200 tracking-tight">
              {result.title}
            </h4>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
              {result.type === "quran" ? "Holy Quran" : "Authentic Hadith"}
            </p>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Arabic calligraphy rendering */}
        <div className="text-right w-full">
          <p className="quran-arabic-text text-zinc-100 selection:bg-emerald-500/30">
            {result.text_arabic}
          </p>
        </div>

        {/* English translation with maximum character width guidelines */}
        <p className="text-sm text-zinc-300 leading-relaxed font-sans max-w-[65ch]">
          {result.text_english}
        </p>

        {/* Metadata Footer: expandable sections */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-zinc-800/40 grid grid-cols-2 gap-3 text-xs font-mono">
                {result.type === "quran" ? (
                  <>
                    <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/30">
                      <span className="text-zinc-500 block">Juz / Chapter</span>
                      <span className="text-zinc-300">{result.metadata.juz}</span>
                    </div>
                    <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/30">
                      <span className="text-zinc-500 block">Revelation Site</span>
                      <span className="text-zinc-300 capitalize">
                        {result.metadata.revelation_place}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/30 col-span-2">
                      <span className="text-zinc-500 block">Grade / Verification</span>
                      <span
                        className={cn("font-semibold", {
                          "text-emerald-400": result.metadata.grade?.toLowerCase() === "sahih",
                          "text-amber-400": result.metadata.grade?.toLowerCase() === "hasan",
                          "text-zinc-400": result.metadata.grade?.toLowerCase() !== "sahih" && result.metadata.grade?.toLowerCase() !== "hasan",
                        })}
                      >
                        {result.metadata.grade || "Authentic Verification"}
                      </span>
                    </div>
                    <div className="bg-zinc-900/30 p-2 rounded-lg border border-zinc-800/30 col-span-2">
                      <span className="text-zinc-500 block">Narrator Chain</span>
                      <span className="text-zinc-300">{result.metadata.narrator_english}</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Accordion trigger footer */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2.5 px-5 bg-zinc-900/10 hover:bg-zinc-900/30 border-t border-zinc-850 flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors uppercase cursor-pointer"
      >
        {isExpanded ? (
          <>
            Hide Context Detail
            <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            Reveal Context Detail
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>

      {/* Fullscreen Detailed Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-800/40 bg-zinc-900/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-950/40 border border-emerald-900/30 flex items-center justify-center text-emerald-400">
                    {result.type === "quran" ? (
                      <BookOpen className="h-6 w-6 stroke-[1.5]" />
                    ) : (
                      <Calendar className="h-6 w-6 stroke-[1.5]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
                      {result.title}
                    </h3>
                    <p className="text-sm text-zinc-500 uppercase tracking-widest font-mono mt-1">
                      {result.type === "quran" ? "Holy Quran Extract" : "Authentic Hadith Extract"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-10 overflow-y-auto flex-1 space-y-10 custom-scrollbar">
                {/* Arabic */}
                <div className="text-right border-b border-zinc-800/40 pb-8">
                  <h4 className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest mb-4 text-left">Original Arabic</h4>
                  <p className="quran-arabic-text text-3xl md:text-5xl text-zinc-100 leading-[1.8] selection:bg-emerald-500/30">
                    {result.text_arabic}
                  </p>
                </div>

                {/* English */}
                <div className="border-b border-zinc-800/40 pb-8">
                  <h4 className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest mb-4">English Translation</h4>
                  <p className="text-lg md:text-xl text-zinc-300 leading-relaxed font-sans">
                    {result.text_english}
                  </p>
                </div>

                {/* Deep Metadata Grid */}
                <div>
                  <h4 className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest mb-4">Detailed Metadata</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-mono">
                    {result.type === "quran" ? (
                      <>
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/30">
                          <span className="text-zinc-500 block mb-1">Surah Name (English)</span>
                          <span className="text-zinc-200">{result.metadata.surah_name_en}</span>
                        </div>
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/30">
                          <span className="text-zinc-500 block mb-1">Surah Name (Arabic)</span>
                          <span className="text-zinc-200">{result.metadata.surah_name_ar}</span>
                        </div>
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/30">
                          <span className="text-zinc-500 block mb-1">Chapter Location</span>
                          <span className="text-zinc-200">Surah {result.metadata.surah_number}, Ayah {result.metadata.ayah_number}</span>
                        </div>
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/30">
                          <span className="text-zinc-500 block mb-1">Juz & Revelation</span>
                          <span className="text-zinc-200 capitalize">Juz {result.metadata.juz} • {result.metadata.revelation_place}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/30">
                          <span className="text-zinc-500 block mb-1">Collection</span>
                          <span className="text-zinc-200">{result.metadata.source}</span>
                        </div>
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/30">
                          <span className="text-zinc-500 block mb-1">Book Name</span>
                          <span className="text-zinc-200">{result.metadata.chapter_name} (Book {result.metadata.book_no})</span>
                        </div>
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/30">
                          <span className="text-zinc-500 block mb-1">Authenticity Grade</span>
                          <span
                            className={cn("font-bold text-lg", {
                              "text-emerald-400": result.metadata.grade?.toLowerCase() === "sahih",
                              "text-amber-400": result.metadata.grade?.toLowerCase() === "hasan",
                              "text-zinc-300": result.metadata.grade?.toLowerCase() !== "sahih" && result.metadata.grade?.toLowerCase() !== "hasan",
                            })}
                          >
                            {result.metadata.grade || "Authentic Verification"}
                          </span>
                        </div>
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/30">
                          <span className="text-zinc-500 block mb-1">Hadith Index</span>
                          <span className="text-zinc-200">#{result.metadata.hadith_no || result.metadata.hadith_id}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
