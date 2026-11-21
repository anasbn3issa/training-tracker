import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/current-user";
import { ownsDay } from "@/lib/program-db";
import { SYNC_BATCH_MAX, SYNC_DAILY_OPS_MAX } from "@/lib/limits";
import { db, isPermanentDbError } from "@/lib/supabase";
import { syncBody, syncOp } from "@/lib/sync-schema";
import type { Op } from "@/lib/types";

type Supabase = ReturnType<typeof db>;
type OpError = { code?: string; message: string } | null;

const FORBIDDEN: OpError = { code: "forbidden", message: "belongs to another user" };

/** PostgREST "function not found": the code runs before the migration that adds use_sync_budget. */
const UNKNOWN_FUNCTION = "PGRST202";

/** Counts `count` ops against the user's daily budget (see use_sync_budget); "error" if it couldn't be checked. */
async function withinDailyBudget(supabase: Supabase, userId: string, count: number): Promise<boolean | "error"> {
  if (count === 0) return true;
  const { data, error } = await supabase.rpc("use_sync_budget", { p_user: userId, p_ops: count, p_limit: SYNC_DAILY_OPS_MAX });
  // Deployed before its migration: no budget yet, rather than refusing every sync.
  if (error?.code === UNKNOWN_FUNCTION) return true;
  if (error) return "error";
  return data;
}

// Before per-user programs, sessions named their day by a global code (A–D). Phones may still hold
// such ops in their outbox: they get the day with that code in the user's oldest program, which is
// the bro-split copy the migration made (a later program can reuse codes like A/B/C).
// Mirrored on the phone by upgradeLegacyOps. TODO: remove both once every phone has synced.
const legacySessionOp = z.object({
  kind: z.literal("upsert"),
  table: z.literal("sessions"),
  row: z.looseObject({ day_code: z.string().nullable() }),
});

async function upgradeLegacy(supabase: Supabase, userId: string, raw: unknown): Promise<unknown> {
  const legacy = legacySessionOp.safeParse(raw);
  if (!legacy.success || "day_id" in legacy.data.row) return raw;
  const { day_code, ...row } = legacy.data.row;
  if (day_code === null) return { ...legacy.data, row: { ...row, day_id: null } };
  const { data, error } = await supabase
    .from("program_days")
    .select("id, programs!program_days_program_id_fkey!inner(user_id, created_at)")
    .eq("code", day_code)
    .eq("programs.user_id", userId);
  if (error) throw new Error(error.message);
  const [oldest] = data.sort((a, b) => a.programs.created_at.localeCompare(b.programs.created_at));
  return { ...legacy.data, row: { ...row, day_id: oldest?.id ?? null } };
}

async function ownerOf(supabase: Supabase, table: "sessions" | "runs", id: string): Promise<string | null> {
  const { data } = await supabase.from(table).select("user_id").eq("id", id).maybeSingle();
  return data?.user_id ?? null;
}

/** Owner of the session a set belongs to (null if the set doesn't exist yet). */
async function setOwner(supabase: Supabase, setId: string): Promise<string | null> {
  const { data } = await supabase.from("set_logs").select("sessions!inner(user_id)").eq("id", setId).maybeSingle();
  return data?.sessions.user_id ?? null;
}

/** Applies one op on behalf of `userId`; refuses anything touching another user's rows. */
async function execute(supabase: Supabase, userId: string, o: Op): Promise<OpError> {
  const isMine = (owner: string | null) => owner === null || owner === userId;

  if (o.kind === "set_block_start") {
    return (await supabase.from("users").update({ block_start_date: o.date }).eq("id", userId)).error;
  }

  if (o.kind === "delete") {
    if (o.table === "set_logs") {
      if (!isMine(await setOwner(supabase, o.id))) return FORBIDDEN;
      return (await supabase.from("set_logs").delete().eq("id", o.id)).error;
    }
    return (await supabase.from(o.table).delete().eq("id", o.id).eq("user_id", userId)).error;
  }

  switch (o.table) {
    case "sessions":
      if (!isMine(await ownerOf(supabase, "sessions", o.row.id))) return FORBIDDEN;
      if (o.row.day_id !== null && !(await ownsDay(supabase, userId, o.row.day_id))) return FORBIDDEN;
      return (await supabase.from("sessions").upsert({ ...o.row, user_id: userId })).error;
    case "runs":
      if (!isMine(await ownerOf(supabase, "runs", o.row.id))) return FORBIDDEN;
      return (await supabase.from("runs").upsert({ ...o.row, user_id: userId })).error;
    case "set_logs":
      // The set's session must be the user's own, and so must an existing set with this id.
      if (!isMine(await ownerOf(supabase, "sessions", o.row.session_id))) return FORBIDDEN;
      if (!isMine(await setOwner(supabase, o.row.id))) return FORBIDDEN;
      return (await supabase.from("set_logs").upsert(o.row)).error;
  }
}

/**
 * Applies ops in order. Responds with how many were applied so the client can
 * drop those from its queue. 422 = the op at `applied` can never succeed
 * (invalid data, constraint violation, another user's row): the client drops
 * it rather than retrying forever.
 */
export async function POST(request: Request) {
  const userId = await currentUser();
  if (!userId) return unauthorized();

  const parsed = syncBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ applied: 0, error: `body must be { ops: [...] } with at most ${SYNC_BATCH_MAX} ops` }, { status: 400 });

  const supabase = db();
  const { ops } = parsed.data;
  const budget = await withinDailyBudget(supabase, userId, ops.length);
  if (budget === "error") return Response.json({ applied: 0, error: "Couldn't check the sync budget." }, { status: 500 });
  // 429: the phone keeps the ops and retries later, like any temporary failure. Nothing is lost.
  if (!budget) return Response.json({ applied: 0, error: "Daily sync limit reached. Try again tomorrow." }, { status: 429 });
  for (let i = 0; i < ops.length; i++) {
    const valid = syncOp.safeParse(await upgradeLegacy(supabase, userId, ops[i]));
    if (!valid.success) return Response.json({ applied: i, error: z.prettifyError(valid.error) }, { status: 422 });
    const error = await execute(supabase, userId, valid.data);
    if (error) {
      const permanent = error.code === "forbidden" || isPermanentDbError(error.code);
      return Response.json({ applied: i, error: error.message }, { status: permanent ? 422 : 500 });
    }
  }
  return Response.json({ applied: ops.length });
}
