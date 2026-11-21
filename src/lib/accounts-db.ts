import "server-only";
import type { AccountStore } from "./accounts";
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
