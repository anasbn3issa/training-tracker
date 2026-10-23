import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

// Server-side only: the secret key bypasses RLS. The browser never talks to
// Supabase directly; it goes through our route handlers.
export function db() {
  return createClient<Database>(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
}
