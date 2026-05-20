"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMagnetic } from "@/hooks/use-magnetic";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const placeholderPrompts = [
  "What does the Quran say about patience (Sabr)?",
  "Hadith on the reward of good intentions",
  "Explain Ayat al-Kursi in light of Surah Al-Ikhlas",
  "Verses about charity (Zakat) and purification",
  "Authentic Hadiths about speaking good or remaining silent",
];

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderText, setPlaceholderText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // High-performance magnetic hover button hook
  const { ref: magneticRef, style: magneticStyle } = useMagnetic({
    pullFactor: 0.25,
  });

  // Typewriter effect for premium bento command bar placeholder
  useEffect(() => {
    let currentPrompt = placeholderPrompts[placeholderIndex];
    let charIndex = 0;
    let isDeleting = false;
    let timer: NodeJS.Timeout;

    const tick = () => {
      currentPrompt = placeholderPrompts[placeholderIndex];
      
      if (!isDeleting) {
        setPlaceholderText(currentPrompt.substring(0, charIndex + 1));
        charIndex++;

        if (charIndex === currentPrompt.length) {
          isDeleting = true;
          // Hold the fully typed prompt for 4 seconds before deleting
          timer = setTimeout(tick, 4000);
          return;
        }
      } else {
        setPlaceholderText(currentPrompt.substring(0, charIndex - 1));
        charIndex--;

        if (charIndex === 0) {
          isDeleting = false;
          setPlaceholderIndex((prev) => (prev + 1) % placeholderPrompts.length);
          // Wait briefly before typing next prompt
          timer = setTimeout(tick, 500);
          return;
        }
      }

      // Fast typing speed, slightly slower deletion speed
      const speed = isDeleting ? 25 : 55;
      timer = setTimeout(tick, speed);
    };

    tick();

    return () => clearTimeout(timer);
  }, [placeholderIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery && !isLoading) {
      onSearch(cleanQuery);
      setQuery("");
    }
  };

  const handleClear = () => {
    setQuery("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative flex items-center w-full max-w-3xl mx-auto rounded-2xl transition-all duration-300 p-1.5 bg-zinc-950/40 border",
        {
          "border-emerald-500/40 shadow-[0_0_25px_-5px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20 bg-zinc-950/80":
            isFocused,
          "border-zinc-800/80 hover:border-zinc-700/80 shadow-lg shadow-black/30": !isFocused,
        }
      )}
    >
      {/* Decorative accent spotlight blur behind */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-1000 -z-10" />

      {/* RAG Sparkle/Search Icon indicator */}
      <div className="pl-4 pr-2 text-zinc-500 flex items-center">
        {isLoading ? (
          <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse stroke-[1.5]" />
        ) : (
          <Search className={cn("h-5 w-5 stroke-[1.5] transition-colors duration-300", {
            "text-emerald-400": isFocused,
          })} />
        )}
      </div>

      {/* Input core */}
      <div className="flex-1 relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isLoading}
          className="w-full h-12 bg-transparent border-0 outline-none focus:ring-0 text-base md:text-lg text-zinc-100 placeholder-transparent select-text pr-10"
        />

        {/* Animated dynamic typewriter placeholder overlay */}
        {!query && (
          <span className="absolute inset-y-0 left-0 flex items-center text-zinc-400 text-base md:text-lg pointer-events-none select-none select-all pl-0 font-sans tracking-wide">
            {placeholderText}
            <span className="animate-[blink_1s_infinite] ml-0.5 text-emerald-400">|</span>
          </span>
        )}

        {/* Clear Action Button (Absolutely positioned so it doesn't push the Send button) */}
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={handleClear}
              className="absolute right-2 p-1.5 text-zinc-500 hover:text-zinc-300 rounded-full hover:bg-zinc-900/60 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* High-Agency Magnetic Action submission button */}
      <motion.button
        ref={magneticRef as any}
        style={magneticStyle}
        type="submit"
        disabled={isLoading || !query.trim()}
        className={cn(
          "h-12 px-7 rounded-xl flex items-center justify-center gap-2 text-sm md:text-base font-semibold tracking-wide transition-all shadow-md cursor-pointer",
          {
            "bg-emerald-600 text-emerald-50 hover:bg-emerald-500 hover:shadow-emerald-950/20 active:scale-[0.98]":
              query.trim() && !isLoading,
            "bg-zinc-800 text-zinc-500 pointer-events-none opacity-40":
              !query.trim() || isLoading,
          }
        )}
      >
        <Sparkles className="h-4 w-4 stroke-[1.8]" />
        <span>Ask Noor</span>
      </motion.button>
    </form>
  );
}
