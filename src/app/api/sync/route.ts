import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/current-user";
import { db } from "@/lib/supabase";
import type { Op } from "@/lib/types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timestamp = z.iso.datetime({ offset: true });

// No user_id in any schema: unknown keys are stripped, the owner always comes from the cookie.

// A program day (A–D), or a custom workout identified by its title.
const session = z
  .object({
    id: z.uuid(),
    day_code: z.string().nullable(),
    title: z.string().trim().min(1).max(80).nullable(),
    date: isoDate,
    block_week: z.int().min(1).max(6),
    notes: z.string().nullable(),
    completed_at: timestamp.nullable(),
  })
  .refine((s) => s.day_code !== null || s.title !== null, "a session needs a day_code or a title");

const setLog = z.object({
  id: z.uuid(),
  session_id: z.uuid(),
  exercise_id: z.string(),
  set_index: z.int().min(1),
  weight_kg: z.number().min(0).nullable(),
  reps: z.int().min(0),
  done_at: timestamp,
});

const run = z.object({
  id: z.uuid(),
  date: isoDate,
  kind: z.enum(["easy", "long", "intervals", "race"]),
  distance_km: z.number().positive(),
  duration_sec: z.int().positive(),
  effort: z.int().min(1).max(10).nullable(),
  notes: z.string().nullable(),
});

const op = z.union([
  z.object({ kind: z.literal("upsert"), table: z.literal("sessions"), row: session }),
  z.object({ kind: z.literal("upsert"), table: z.literal("set_logs"), row: setLog }),
  z.object({ kind: z.literal("upsert"), table: z.literal("runs"), row: run }),
  z.object({ kind: z.literal("delete"), table: z.enum(["sessions", "set_logs", "runs"]), id: z.uuid() }),
  z.object({ kind: z.literal("set_block_start"), date: isoDate }),
]);

// Ops are validated one by one, so a single bad op is reported at its exact index.
const body = z.object({ ops: z.array(z.unknown()) });

type Supabase = ReturnType<typeof db>;
type OpError = { code?: string; message: string } | null;

const FORBIDDEN: OpError = { code: "forbidden", message: "belongs to another user" };

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

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ applied: 0, error: "body must be { ops: [...] }" }, { status: 400 });

  const supabase = db();
  const { ops } = parsed.data;
  for (let i = 0; i < ops.length; i++) {
    const valid = op.safeParse(ops[i]);
    if (!valid.success) return Response.json({ applied: i, error: z.prettifyError(valid.error) }, { status: 422 });
    const error = await execute(supabase, userId, valid.data);
    if (error) {
      // Postgres classes 22 (data exception) and 23 (integrity violation) won't fix themselves.
      const permanent = error.code === "forbidden" || error.code?.startsWith("22") || error.code?.startsWith("23");
      return Response.json({ applied: i, error: error.message }, { status: permanent ? 422 : 500 });
    }
  }
  return Response.json({ applied: ops.length });
}
