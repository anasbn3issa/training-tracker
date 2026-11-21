import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/** Postgres classes 22 (data exception) and 23 (integrity violation) won't fix themselves: retrying is pointless. */
export const isPermanentDbError = (code: string | undefined) => code?.startsWith("22") === true || code?.startsWith("23") === true;

// Server-side only: the secret key bypasses RLS. The browser never talks to
// Supabase directly; it goes through our route handlers.
export function db() {
  return createClient<Database>(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
}
