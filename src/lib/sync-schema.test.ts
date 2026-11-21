import { describe, expect, it } from "vitest";
import { NOTES_MAX, SYNC_BATCH_MAX } from "./limits";
import { syncBody, syncOp } from "./sync-schema";

const run = (notes: string | null, extra: Record<string, unknown> = {}) => ({
  kind: "upsert",
  table: "runs",
  row: {
    id: "6f1c2c4e-8b1a-4f0e-9a51-0c3c7a8f2d11",
    date: "2026-11-21",
    kind: "easy",
    distance_km: 5,
    duration_sec: 1800,
    effort: null,
    notes,
    ...extra,
  },
});

const set = (overrides: Record<string, unknown>) => ({
  kind: "upsert",
  table: "set_logs",
  row: {
    id: "3b2a1c4e-8b1a-4f0e-9a51-0c3c7a8f2d12",
    session_id: "0a9b8c7d-8b1a-4f0e-9a51-0c3c7a8f2d13",
    exercise_id: "seated-ohp",
    set_index: 1,
    weight_kg: 40,
    reps: 10,
    done_at: "2026-11-21T20:00:00Z",
    ...overrides,
  },
});

describe("syncBody", () => {
  it("accepts a full batch and refuses one more op", () => {
    expect(syncBody.safeParse({ ops: Array(SYNC_BATCH_MAX).fill({}) }).success).toBe(true);
    expect(syncBody.safeParse({ ops: Array(SYNC_BATCH_MAX + 1).fill({}) }).success).toBe(false);
  });
});

describe("syncOp", () => {
  it("trims a long note instead of refusing the op (the phone would drop it)", () => {
    const parsed = syncOp.parse(run("x".repeat(NOTES_MAX + 50)));
    expect(parsed.kind === "upsert" && parsed.table === "runs" && parsed.row.notes?.length).toBe(NOTES_MAX);
  });

  it("keeps a normal note and no note as they are", () => {
    const parsed = syncOp.parse(run("felt good"));
    expect(parsed.kind === "upsert" && parsed.table === "runs" && parsed.row.notes).toBe("felt good");
    expect(syncOp.safeParse(run(null)).success).toBe(true);
  });

  it("accepts real sets and refuses absurd ones", () => {
    expect(syncOp.safeParse(set({})).success).toBe(true);
    expect(syncOp.safeParse(set({ set_index: 101 })).success).toBe(false);
    expect(syncOp.safeParse(set({ weight_kg: 1001 })).success).toBe(false);
    expect(syncOp.safeParse(set({ reps: 1001 })).success).toBe(false);
  });

  it("refuses an absurd run", () => {
    expect(syncOp.safeParse(run(null, { distance_km: 1001 })).success).toBe(false);
    expect(syncOp.safeParse(run(null, { duration_sec: 8 * 24 * 3600 })).success).toBe(false);
  });

  it("strips a user_id sent by the phone: the owner comes from the cookie", () => {
    const parsed = syncOp.parse(run(null, { user_id: "someone-else" }));
    expect(parsed.kind === "upsert" && "user_id" in parsed.row).toBe(false);
  });
});
