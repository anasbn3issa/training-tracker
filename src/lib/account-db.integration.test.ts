// Runs against a real database: `npm run test:db` (local Supabase, values from .env.local).
// Skipped by `npm test`, which has no database. Creates throwaway users and deletes them.
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "./database.types";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

describe.skipIf(!url || !key)("database: accounts", () => {
  const supabase = createClient<Database>(url ?? "", key ?? "", { auth: { persistSession: false } });
  const created: string[] = [];

  async function newUser() {
    const id = `zz-test-${crypto.randomUUID()}`;
    const { error } = await supabase.from("users").insert({ id, name: "Test" });
    if (error) throw new Error(error.message);
    created.push(id);
    return id;
  }

  const count = async (query: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: n, error } = await query;
    if (error) throw new Error(error.message);
    return n;
  };

  afterAll(async () => {
    for (const id of created) await supabase.rpc("delete_user", { p_user: id });
  });

  it("delete_user removes the user and everything they own", async () => {
    const userId = await newUser();

    // A program copied from a template, with its week.
    const { data: template } = await supabase.from("programs").select("id").is("user_id", null).limit(1).single();
    if (!template) throw new Error("no template in this database: run the seed");
    const { data: days } = await supabase.from("program_days").select("code").eq("program_id", template.id).limit(1);
    const { error: chooseError } = await supabase.rpc("choose_program", {
      p_user: userId,
      p_template: template.id,
      p_schedule: [{ weekday: 1, code: days?.[0]?.code ?? "A" }],
      p_block_start: "2026-11-16",
    });
    expect(chooseError).toBeNull();

    // A workout with a set, a run, and a day of sync budget.
    const sessionId = crypto.randomUUID();
    await supabase.from("sessions").insert({ id: sessionId, user_id: userId, day_id: null, title: "Arms", date: "2026-11-21", block_week: 1 });
    await supabase
      .from("set_logs")
      .insert({ id: crypto.randomUUID(), session_id: sessionId, exercise_id: "seated-ohp", set_index: 1, weight_kg: 40, reps: 10, done_at: "2026-11-21T20:00:00Z" });
    await supabase.from("runs").insert({ id: crypto.randomUUID(), user_id: userId, date: "2026-11-21", kind: "easy", distance_km: 5, duration_sec: 1800 });
    await supabase.rpc("use_sync_budget", { p_user: userId, p_ops: 3, p_limit: 2000 });

    const { error } = await supabase.rpc("delete_user", { p_user: userId });
    expect(error).toBeNull();

    const head: { count: "exact"; head: boolean } = { count: "exact", head: true };
    expect(await count(supabase.from("users").select("id", head).eq("id", userId))).toBe(0);
    expect(await count(supabase.from("sessions").select("id", head).eq("user_id", userId))).toBe(0);
    expect(await count(supabase.from("set_logs").select("id", head).eq("session_id", sessionId))).toBe(0);
    expect(await count(supabase.from("runs").select("id", head).eq("user_id", userId))).toBe(0);
    expect(await count(supabase.from("programs").select("id", head).eq("user_id", userId))).toBe(0);
    expect(await count(supabase.from("sync_usage").select("day", head).eq("user_id", userId))).toBe(0);
    // Templates are shared: never touched.
    expect(await count(supabase.from("programs").select("id", head).eq("id", template.id))).toBe(1);
  });

  it("use_sync_budget refuses ops past the daily limit without counting them", async () => {
    const userId = await newUser();
    const use = async (ops: number) => (await supabase.rpc("use_sync_budget", { p_user: userId, p_ops: ops, p_limit: 150 })).data;

    expect(await use(100)).toBe(true);
    expect(await use(100)).toBe(false); // 200 > 150: refused, and not counted
    expect(await use(50)).toBe(true); // exactly 150
    expect(await use(1)).toBe(false);
  });
});
