import { z } from "zod";
import { db } from "@/lib/supabase";
import type { Op } from "@/lib/types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timestamp = z.iso.datetime({ offset: true });

const session = z.object({
  id: z.uuid(),
  day_code: z.string(),
  date: isoDate,
  block_week: z.int().min(1).max(6),
  notes: z.string().nullable(),
  completed_at: timestamp.nullable(),
});

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
]);

// Ops are validated one by one, so a single bad op is reported at its exact index.
const body = z.object({ ops: z.array(z.unknown()) });

function execute(supabase: ReturnType<typeof db>, o: Op) {
  if (o.kind === "delete") return supabase.from(o.table).delete().eq("id", o.id);
  switch (o.table) {
    case "sessions":
      return supabase.from("sessions").upsert(o.row);
    case "set_logs":
      return supabase.from("set_logs").upsert(o.row);
    case "runs":
      return supabase.from("runs").upsert(o.row);
  }
}

/**
 * Applies ops in order. Responds with how many were applied so the client can
 * drop those from its queue. 422 = the op at `applied` can never succeed
 * (invalid data, constraint violation): the client drops it rather than retrying forever.
 */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ applied: 0, error: "body must be { ops: [...] }" }, { status: 400 });

  const supabase = db();
  const { ops } = parsed.data;
  for (let i = 0; i < ops.length; i++) {
    const valid = op.safeParse(ops[i]);
    if (!valid.success) return Response.json({ applied: i, error: z.prettifyError(valid.error) }, { status: 422 });
    const { error } = await execute(supabase, valid.data);
    if (error) {
      // Postgres classes 22 (data exception) and 23 (integrity violation) won't fix themselves.
      const permanent = error.code?.startsWith("22") || error.code?.startsWith("23");
      return Response.json({ applied: i, error: error.message }, { status: permanent ? 422 : 500 });
    }
  }
  return Response.json({ applied: ops.length });
}
