"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChatInterface } from "@/components/rag/chat-interface";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  BookOpen, 
  Search, 
  ArrowRight, 
  ChevronRight, 
  Command, 
  Compass, 
  HelpCircle, 
  Activity, 
  Database, 
  Lock, 
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  Cpu,
  Layers,
  Heart
} from "lucide-react";

// ---------------------------------------------------------
// Sub-component: Typographic background particle blur glow
// ---------------------------------------------------------
function GlowingBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20">
      <motion.div 
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -50, 30, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-emerald-500/5 blur-[120px]"
      />
      <motion.div 
        animate={{
          x: [0, -30, 50, 0],
          y: [0, 40, -40, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-teal-500/4 blur-[140px]"
      />
    </div>
  );
}

// ---------------------------------------------------------
// Sub-component: Typewriter Placeholder Search Input
// ---------------------------------------------------------
const PLACEHOLDERS = [
  "What is the spiritual significance of Sabr (patience)?",
  "Find authentic Hadiths about actions and pure intentions.",
  "Explain Ayat al-Kursi (2:255) according to classical scholars.",
  "What does the Quran reveal about anxiety and heart comfort?",
  "How is Rizq (sustenance) defined and guaranteed in Islam?",
  "Show passages regarding night prayers (Tahajjud) blessings.",
];

interface HeroSearchProps {
  onSearch: (query: string) => void;
}

function HeroSearch({ onSearch }: HeroSearchProps) {
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fullText = PLACEHOLDERS[placeholderIndex];
    const typingSpeed = isDeleting ? 25 : 60;

    if (!isDeleting && currentText === fullText) {
      timer = setTimeout(() => setIsDeleting(true), 3500);
    } else if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    } else {
      timer = setTimeout(() => {
        setCurrentText(
          isDeleting
            ? fullText.substring(0, currentText.length - 1)
            : fullText.substring(0, currentText.length + 1)
        );
      }, typingSpeed);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, placeholderIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    } else {
      onSearch(PLACEHOLDERS[placeholderIndex]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl relative group px-2 sm:px-0">
      <div 
        className={cn(
          "w-full bg-[#121214]/65 backdrop-blur-xl border rounded-2xl flex items-center p-2 transition-all duration-500 relative z-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_15px_35px_-10px_rgba(0,0,0,0.6)]",
          {
            "border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-[inset_0_1px_0_rgba(16,185,129,0.1),0_20px_40px_-10px_rgba(0,0,0,0.7)]": isFocused,
            "border-zinc-800/80 hover:border-zinc-700/80": !isFocused,
          }
        )}
      >
        <div className="pl-3.5 pr-2 text-zinc-500 flex items-center select-none">
          <Search className={cn("h-5 w-5 stroke-[1.5] transition-colors duration-300", { "text-emerald-400": isFocused })} />
        </div>

        <div className="flex-1 relative h-10 flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full bg-transparent text-zinc-200 placeholder-transparent focus:outline-none text-base md:text-lg font-sans leading-none z-10"
            autoComplete="off"
            spellCheck="false"
          />
          
          {query === "" && (
            <div className="absolute inset-0 flex items-center text-zinc-400 font-sans text-base md:text-lg pointer-events-none select-none">
              <span>{currentText}</span>
              <span className="h-5 w-[2px] bg-emerald-500 ml-0.5 animate-[pulse_1s_infinite]" />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="ml-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] transition-all text-sm font-bold font-mono tracking-wider uppercase text-emerald-50 flex items-center gap-2 shadow-md shadow-emerald-950/20 cursor-pointer"
        >
          <span>Ask</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div 
        className={cn(
          "absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/10 blur-xl opacity-0 transition duration-1000 -z-10 group-hover:opacity-40",
          { "opacity-80 scale-[1.02]": isFocused }
        )}
      />
    </form>
  );
}

// ---------------------------------------------------------
// Sub-component: Continuous wide data stream carousel
// ---------------------------------------------------------
const SOURCE_TAGS = [
  { label: "Surah Al-Fatihah", code: "Quran 1" },
  { label: "Sahih al-Bukhari", code: "Hadith #1" },
  { label: "Surah Al-Baqarah", code: "Quran 2" },
  { label: "Sahih Muslim", code: "Hadith #223" },
  { label: "Surah Al-Ikhlas", code: "Quran 112" },
  { label: "Surah Yusuf", code: "Quran 12" },
  { label: "Riyad as-Salihin", code: "Hadith #45" },
  { label: "Surah Ya-Sin", code: "Quran 36" },
];

function WideDataStream() {
  return (
    <div className="w-full relative overflow-hidden py-3 bg-zinc-950/40 border-y border-zinc-900/60 select-none">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#09090b] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#09090b] to-transparent z-10 pointer-events-none" />
      
      <div className="flex gap-6 animate-[marquee_40s_linear_infinite] whitespace-nowrap min-w-max">
        {[...SOURCE_TAGS, ...SOURCE_TAGS, ...SOURCE_TAGS].map((tag, idx) => (
          <div 
            key={idx} 
            className="inline-flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-1.5 rounded-full"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-zinc-400">
              {tag.label}
            </span>
            <span className="text-[9px] font-semibold font-mono text-emerald-500/80 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded uppercase">
              {tag.code}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// DATA CONSTANTS FOR DYNAMIC LOADING
// ---------------------------------------------------------

const REFLECTIONS = [
  {
    text_arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
    text_english: '"Allah does not burden a soul beyond that it can bear. It will have [the consequence of] what [good] it has earned..."',
    reference: "Surah Al-Baqarah 2:286",
    juz: "Juz 3",
    site: "Madinah",
    focus: "Solace / Relief",
    query: "What are the blessings of Sabr in hard times?"
  },
  {
    text_arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    text_english: '"Indeed, with hardship [will be] ease."',
    reference: "Surah Ash-Sharh 94:6",
    juz: "Juz 30",
    site: "Makkah",
    focus: "Hope / Reassurance",
    query: "What does the Quran say about hardship and ease?"
  },
  {
    text_arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
    text_english: '"Actions are judged by intentions, and every person will get what they intended."',
    reference: "Bukhari Hadith #1",
    juz: "N/A",
    site: "Authentic",
    focus: "Intention / Sincerity",
    query: "Hadith on the reward of good intentions"
  },
  {
    text_arabic: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ",
    text_english: '"And when My servants ask you concerning Me - indeed I am near."',
    reference: "Surah Al-Baqarah 2:186",
    juz: "Juz 2",
    site: "Madinah",
    focus: "Connection / Du'a",
    query: "How does Allah respond to our prayers?"
  }
];

const PREVIEWS = [
  {
    type: "quran",
    match: "94%",
    arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    english: "\"Say, 'He is Allah, [who is] One,\"",
    title: "Al-Ikhlas 112:1",
    subtitle: "Juz 30 • Makkah"
  },
  {
    type: "hadith",
    match: "89%",
    arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
    english: "\"Actions are judged by intentions, and every person will get what they intended.\"",
    title: "Bukhari Hadith #1",
    subtitle: "Sahih"
  },
  {
    type: "quran",
    match: "87%",
    arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    english: "\"[All] praise is [due] to Allah, Lord of the worlds -\"",
    title: "Al-Fatihah 1:2",
    subtitle: "Juz 1 • Makkah"
  },
  {
    type: "quran",
    match: "92%",
    arabic: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا",
    english: "\"And whoever fears Allah - He will make for him a way out.\"",
    title: "At-Talaq 65:2",
    subtitle: "Juz 28 • Madinah"
  },
  {
    type: "hadith",
    match: "85%",
    arabic: "الدِّينُ النَّصِيحَةُ",
    english: "\"Religion is sincerity/good advice.\"",
    title: "Muslim Hadith #55",
    subtitle: "Sahih"
  }
];


// ---------------------------------------------------------
// MAIN EXPORT LANDING PAGE
// ---------------------------------------------------------
export default function Home() {
  const [activeQuery, setActiveQuery] = useState("");
  const workspaceRef = useRef<HTMLDivElement>(null);
  
  const [reflection, setReflection] = useState(REFLECTIONS[0]);
  const [previews, setPreviews] = useState(PREVIEWS.slice(0, 3));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Pick random daily reflection and 3 random previews on client load to avoid hydration mismatch
    const randomReflection = REFLECTIONS[Math.floor(Math.random() * REFLECTIONS.length)];
    setReflection(randomReflection);

    const shuffledPreviews = [...PREVIEWS].sort(() => 0.5 - Math.random()).slice(0, 3);
    setPreviews(shuffledPreviews);
    
    setMounted(true);
  }, []);

  // Trigger search from Hero / Suggestions
  const handleQueryTrigger = (query: string) => {
    setActiveQuery(query);
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const SUGGESTED_TOPICS = [
    { name: "Patience (Sabr)", query: "What are the blessings and rewards of practicing Sabr (patience) according to Quran and Hadith?" },
    { name: "Anxiety & Relief", query: "What does the Quran reveal about anxiety and heart comfort? Help me find peace." },
    { name: "Intentions (Niyyah)", query: "Show me authentic Hadiths about actions being judged by intentions and how to purify my intentions." },
    { name: "Rizq (Sustenance)", query: "How is Rizq defined and guaranteed in Islam? Provide Quranic context." },
    { name: "Forgiveness (Istighfar)", query: "Explain what the Quran says about charity and repentance removing sins and purifying wealth." },
    { name: "Prayer (Tahajjud)", query: "Show passages regarding night prayers (Tahajjud) blessings and spiritual status." },
    { name: "Self-Discipline", query: "What are Islamic theological guidance blocks on self-discipline and fighting laziness?" },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] relative bg-[#09090b] text-zinc-100 overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-100">
      
      {/* 1. Global textures & background gradients */}
      <div className="fixed inset-0 z-50 noise-overlay pointer-events-none" />
      <div className="fixed inset-0 -z-10 mesh-gradient pointer-events-none" />
      <GlowingBackground />

      {/* 2. Premium Sticky Nav-bar (Editorial Layout) */}
      <header className="sticky top-0 z-40 w-full bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-900/60 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 select-none cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
              <Sparkles className="h-5 w-5 stroke-[1.5]" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-zinc-100 uppercase">
                Noor <span className="text-emerald-400">AI</span>
              </span>
              <span className="block text-[8px] font-mono tracking-widest text-zinc-500 -mt-1 uppercase">
                Grounded Core v1
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 font-mono text-[10px] text-zinc-500 uppercase tracking-widest select-none">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-[pulse_2s_infinite]" />
              <span>Pipeline: Online</span>
            </div>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-zinc-650" />
              <span>Embeddings: Ollama</span>
            </div>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-zinc-650" />
              <span className="text-zinc-400 font-semibold">768 Dimensions</span>
            </div>
          </div>

          <div>
            <button
              onClick={() => workspaceRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/30 transition-all font-mono text-[10px] font-bold tracking-widest uppercase cursor-pointer"
            >
              Console
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative w-full max-w-7xl mx-auto px-4 pt-16 md:pt-24 pb-8 flex flex-col justify-center items-center text-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-4 max-w-3xl"
        >
          <span className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-500 font-mono block">
            AI-Native Islamic Grounding Engine
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter leading-[1.05] text-zinc-100 font-sans">
            Ask. Reflect. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-100">
              Understand.
            </span>
          </h1>
          <p className="text-base md:text-xl text-zinc-350 leading-relaxed max-w-[55ch] mx-auto pt-4 font-medium">
            AI-powered answers strictly grounded in the Holy Quran and authentic Hadiths with vector embeddings, semantic search, and citation mapping.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
          className="w-full flex justify-center"
        >
          <HeroSearch onSearch={handleQueryTrigger} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="w-full max-w-3xl flex flex-wrap justify-center gap-2 px-2"
        >
          {SUGGESTED_TOPICS.map((topic, idx) => (
            <button
              key={idx}
              onClick={() => handleQueryTrigger(topic.query)}
              className="px-4 py-2 rounded-full bg-zinc-950/40 hover:bg-emerald-950/20 border border-zinc-900 hover:border-emerald-500/20 text-sm font-semibold text-zinc-450 hover:text-emerald-400 transition-all cursor-pointer active:scale-[0.97]"
            >
              {topic.name}
            </button>
          ))}
        </motion.div>
      </section>

      {/* 4. PRIMARY CORE RAG DIALOGUE WORKSPACE (Moved to TOP!) */}
      <div 
        ref={workspaceRef} 
        id="workspace" 
        className="w-full bg-[#09090b] py-8 scroll-mt-16 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col gap-6">
          <div className="w-full bg-[#0a0a0d]/80 border border-zinc-800 rounded-3xl shadow-[0_0_50px_-12px_rgba(16,185,129,0.1)] relative">
            <ChatInterface 
              initialQuery={activeQuery} 
              onQueryProcessed={() => setActiveQuery("")} 
            />
          </div>
        </div>
      </div>

      {/* 5. SEEDING & SOURCES DATASTREAM CAROUSEL */}
      <WideDataStream />

      {/* 6. DAILY REFLECTION SECTION (Dynamic) */}
      {mounted && (
        <section className="w-full max-w-7xl mx-auto px-4 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-emerald-500" />
              <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Daily Quranic Reflection</span>
            </div>

            <div className="glass-panel rounded-3xl p-6 md:p-10 space-y-6 border border-zinc-800/40 relative shadow-2xl overflow-hidden group">
              <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 blur-[50px] pointer-events-none -z-10" />

              <div className="text-right w-full">
                <p className="font-arabic text-2xl md:text-3xl lg:text-4xl text-zinc-100 leading-loose tracking-wide selection:bg-emerald-500/30">
                  {reflection.text_arabic}
                </p>
              </div>

              <div className="space-y-2 border-t border-zinc-900/60 pt-6">
                <span className="font-mono text-xs text-emerald-400 uppercase tracking-wider block">{reflection.reference}</span>
                <p className="text-base md:text-lg text-zinc-200 leading-relaxed font-sans max-w-[65ch]">
                  {reflection.text_english}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-900/60 text-sm font-mono">
                <div>
                  <span className="text-zinc-500 block text-xs uppercase tracking-wider">Juz / Chapter</span>
                  <span className="text-zinc-350 font-bold">{reflection.juz}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-xs uppercase tracking-wider">Site / Source</span>
                  <span className="text-zinc-350 font-bold">{reflection.site}</span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="text-zinc-500 block text-xs uppercase tracking-wider">Contextual Focus</span>
                  <span className="text-zinc-350 font-bold text-emerald-400 uppercase">{reflection.focus}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <Compass className="h-5 w-5 stroke-[1.5]" />
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-100">
                Restoring Calm Through Authentic Truth
              </h2>
              <p className="text-base md:text-lg text-zinc-300 leading-relaxed">
                In moments of hardship, the scriptures offer profound solace. Noor AI bypasses default statistical chat hallucinations. By cross-referencing vector matches inside the grounded database, it presents verbatim Arabic scripts alongside trusted scholarship.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleQueryTrigger(reflection.query)}
                className="group inline-flex items-center gap-2.5 text-sm font-bold font-mono tracking-widest text-emerald-400 hover:text-emerald-300 uppercase transition-colors cursor-pointer"
              >
                <span>Reflect on this passage</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 7. REFERENCE VERIFICATION PREVIEW CONTAINER (Dynamic) */}
      {mounted && (
        <section className="w-full max-w-7xl mx-auto px-4 py-16 md:py-24 flex flex-col gap-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="max-w-md">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500 font-mono block mb-2">
                Verbatim Database Cards
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-zinc-100">
                Grounded Reference Previews
              </h2>
            </div>
            <div>
              <span className="text-[10px] font-bold font-mono border border-zinc-800 bg-zinc-950/20 px-3 py-1.5 rounded-full text-zinc-500 uppercase tracking-widest">
                SAMPLE ENTRIES
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {previews.map((preview, i) => (
              <div key={i} className="glass-panel rounded-2xl p-5 border border-zinc-800/40 hover:border-emerald-500/20 transition-all duration-300 flex flex-col justify-between gap-5 group">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <span className={cn("text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded", {
                    "text-emerald-400 bg-emerald-950/40 border border-emerald-900/30": preview.type === "quran",
                    "text-zinc-400 bg-zinc-900 border border-zinc-850": preview.type === "hadith",
                  })}>
                    {preview.type === "quran" ? "Holy Quran" : "Authentic Hadith"}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Match {preview.match}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <p className="font-arabic text-right text-lg text-zinc-100 leading-relaxed selection:bg-emerald-500/30">
                    {preview.arabic}
                  </p>
                  <p className="text-sm md:text-base text-zinc-205 leading-relaxed">
                    {preview.english}
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-3 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>{preview.title}</span>
                  <span className={cn({ "text-emerald-400 font-bold": preview.type === "hadith" })}>
                    {preview.subtitle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. MINIMAL PREMIUM FOOTER */}
      <footer className="w-full bg-zinc-950/40 border-t border-zinc-900/60 py-10 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-xs text-zinc-500 uppercase tracking-widest select-none">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500/60" />
            <span>Noor AI Grounded Core | theological rights reserved</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <span className="h-3 w-px bg-zinc-900" />
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
            <span className="h-3 w-px bg-zinc-900" />
            <span className="text-zinc-500 flex items-center gap-1">
              <span>Made with</span>
              <Heart className="h-3 w-3 text-red-500/60 fill-red-500/20" />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
