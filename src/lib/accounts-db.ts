import "server-only";
import { canSignIn, type AccountStore } from "./accounts";
import type { db } from "./supabase";

export function supabaseAccounts(supabase: ReturnType<typeof db>): AccountStore {
  return {
    async findBySub(sub) {
      const { data, error } = await supabase.from("users").select("id, name").eq("google_sub", sub).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    async claimByEmail(email, sub) {
      const { data, error } = await supabase
        .from("users")
        .update({ google_sub: sub })
        .eq("email", email)
        .is("google_sub", null)
        .select("id, name")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    async create({ id, name, email, sub }) {
      const { data, error } = await supabase
        .from("users")
        .insert({ id, name, email, google_sub: sub })
        .select("id, name")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  };
}

/** Postgres "undefined_column": the code runs before the migration that adds the column. */
const UNDEFINED_COLUMN = "42703";

/** Whether `userId` may use the app: still exists and isn't blocked (see canSignIn). */
export async function isActiveUser(supabase: ReturnType<typeof db>, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("users").select("disabled_at").eq("id", userId).maybeSingle();
  if (error?.code === UNDEFINED_COLUMN) {
    // Deployed before users.disabled_at exists: nobody can be blocked yet, so only check the user exists.
    // Without this, every API call fails until the migration is applied by hand.
    const exists = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
    if (exists.error) throw new Error(exists.error.message);
    return exists.data !== null;
  }
  if (error) throw new Error(error.message);
  return canSignIn(data);
}
