// ============================================================
// Supabase client — SERVER ONLY.
// ============================================================
// Uses the SECRET key, which bypasses Row Level Security. It must never
// reach the browser. Note the absence of a NEXT_PUBLIC_ prefix on
// SUPABASE_SERVICE_KEY — that is deliberate and load-bearing.
//
// All database access in this project is server-side (the audit logger and
// the order recorder), so the secret key is the correct choice here.
// ============================================================

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let instance: SupabaseClient | null = null;

/**
 * The shared Supabase client, created on first use.
 *
 * Returns `null` when Supabase is not configured, so the agent can still run
 * without a database — audit logging degrades to console output rather than
 * taking down the whole chat. Losing the audit trail is bad; losing the demo
 * is worse.
 */
export function supabase(): SupabaseClient | null {
  if (instance) return instance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.warn(
      "[supabase] Not configured — set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_KEY. Audit entries will not be persisted.",
    );
    return null;
  }

  instance = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return instance;
}

/** True when a database is available to write to. */
export function hasDatabase(): boolean {
  return supabase() !== null;
}
