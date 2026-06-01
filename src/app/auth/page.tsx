"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fiqah, setFiqah] = useState("Open to all");

  const fiqahOptions = [
    "Open to all",
    "Hanafi",
    "Shafi'i",
    "Maliki",
    "Hanbali",
    "Jafari",
    "Zaidi",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              fiqah_preference: fiqah,
            },
          },
        });
        if (error) throw error;
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden px-4">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-zinc-950/60">
          
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Moon className="text-emerald-400 w-6 h-6" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
              {mode === "login" ? "Welcome back to Noor AI" : "Join Noor AI"}
            </h1>
            <p className="text-sm text-zinc-400 mt-2">
              {mode === "login"
                ? "Enter your credentials to continue your journey."
                : "Create an account for personalized insights."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 ml-1">Email Address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-900/80 border-zinc-800/80 focus:ring-emerald-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 ml-1">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-900/80 border-zinc-800/80 focus:ring-emerald-500/50"
              />
            </div>

            <AnimatePresence>
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-xs font-medium text-zinc-300 ml-1 flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-emerald-500" />
                    School of Thought (Fiqah)
                  </label>
                  <select
                    value={fiqah}
                    onChange={(e) => setFiqah(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-sm shadow-sm transition-colors text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent appearance-none"
                  >
                    {fiqahOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              variant="default"
              className="w-full mt-6"
              loading={loading}
            >
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
