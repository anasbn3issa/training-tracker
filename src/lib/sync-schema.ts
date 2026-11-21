import { z } from "zod";
import { NOTES_MAX, SYNC_BATCH_MAX } from "./limits";
import { isoDate } from "./schemas";

// What /api/sync accepts. No user_id in any schema: unknown keys are stripped, the owner always comes
// from the cookie. Ceilings only stop absurd values, never a real set or run.

const timestamp = z.iso.datetime({ offset: true });

// Trimmed rather than refused: a refused op is dropped by the phone with the rest of its session,
// and phones may still hold longer notes queued before the limit existed.
const notes = z
  .string()
  .transform((s) => s.slice(0, NOTES_MAX))
  .nullable();

// A program day, or a custom workout identified by its title.
const session = z
  .object({
    id: z.uuid(),
    day_id: z.uuid().nullable(),
    title: z.string().trim().min(1).max(80).nullable(),
    date: isoDate,
    block_week: z.int().min(1).max(6),
    notes,
    completed_at: timestamp.nullable(),
  })
  .refine((s) => s.day_id !== null || s.title !== null, "a session needs a day_id or a title");

const setLog = z.object({
  id: z.uuid(),
  session_id: z.uuid(),
  exercise_id: z.string().max(64),
  set_index: z.int().min(1).max(100),
  weight_kg: z.number().min(0).max(1000).nullable(),
  reps: z.int().min(0).max(1000),
  done_at: timestamp,
});

const run = z.object({
  id: z.uuid(),
  date: isoDate,
  kind: z.enum(["easy", "long", "intervals", "race"]),
  distance_km: z.number().positive().max(1000),
  duration_sec: z.int().positive().max(7 * 24 * 3600),
  effort: z.int().min(1).max(10).nullable(),
  notes,
});

export const syncOp = z.union([
  z.object({ kind: z.literal("upsert"), table: z.literal("sessions"), row: session }),
  z.object({ kind: z.literal("upsert"), table: z.literal("set_logs"), row: setLog }),
  z.object({ kind: z.literal("upsert"), table: z.literal("runs"), row: run }),
  z.object({ kind: z.literal("delete"), table: z.enum(["sessions", "set_logs", "runs"]), id: z.uuid() }),
  z.object({ kind: z.literal("set_block_start"), date: isoDate }),
]);

// Ops are validated one by one (syncOp), so a single bad op is reported at its exact index.
export const syncBody = z.object({ ops: z.array(z.unknown()).max(SYNC_BATCH_MAX) });
