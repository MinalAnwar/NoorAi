/**
 * @file src/lib/supabase/client.ts
 * @description Supabase client factory for the Noor AI application.
 *
 * Exports two clients:
 * - `supabase`       — public anon key client (RLS-scoped, browser-safe)
 * - `supabaseAdmin`  — service-role client (bypasses RLS, scripts only)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Polyfill fetch and WebSocket for bare Node.js < 18 environments (like ts-node)
if (typeof window === "undefined") {
  if (typeof globalThis.fetch === "undefined") {
    require("cross-fetch/polyfill");
  }
  if (typeof globalThis.WebSocket === "undefined") {
    globalThis.WebSocket = require("ws");
  }
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ---------------------------------------------------------------------------
// Public client (anon key, respects RLS)
// ---------------------------------------------------------------------------

if (
  typeof window !== "undefined" &&
  (!supabaseUrl || !supabaseAnonKey)
) {
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

/**
 * Singleton Supabase client using the anonymous key.
 * Safe for client-side use — respects Row Level Security.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
);

// ---------------------------------------------------------------------------
// Admin client (service role key, bypasses RLS — server/scripts only)
// ---------------------------------------------------------------------------

/**
 * Create a Supabase admin client that bypasses RLS.
 * Only use in server-side scripts and API routes — **never expose to the browser**.
 *
 * @throws If the required environment variables are missing.
 */
export function createAdminClient(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL is required for admin client.",
    );
  }
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is required for admin client. " +
        "Set it in .env (never commit this key).",
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
