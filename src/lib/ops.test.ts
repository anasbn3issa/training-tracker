import { describe, expect, it } from "vitest";
import { applyOps } from "./ops";
import type { LogState, Session, SetLog } from "./types";

const session: Session = { id: "s1", day_code: "A", date: "2026-10-26", block_week: 5, notes: null, completed_at: null };
const set = (id: string, reps: number): SetLog => ({
  id,
  session_id: "s1",
  exercise_id: "incline-db-press",
  set_index: 1,
  weight_kg: 27.5,
  reps,
  done_at: "2026-10-26T18:00:00Z",
});
const empty: LogState = { sessions: [], setLogs: [], runs: [] };

describe("applyOps", () => {
  it("inserts new rows", () => {
    const state = applyOps(empty, [
      { kind: "upsert", table: "sessions", row: session },
      { kind: "upsert", table: "set_logs", row: set("x", 10) },
    ]);
    expect(state.sessions).toEqual([session]);
    expect(state.setLogs).toEqual([set("x", 10)]);
  });

  it("replaces a row with the same id (last write wins)", () => {
    const state = applyOps({ ...empty, setLogs: [set("x", 10)] }, [{ kind: "upsert", table: "set_logs", row: set("x", 8) }]);
    expect(state.setLogs).toEqual([set("x", 8)]);
  });

  it("deletes a row", () => {
    const state = applyOps({ ...empty, setLogs: [set("x", 10), set("y", 9)] }, [{ kind: "delete", table: "set_logs", id: "x" }]);
    expect(state.setLogs).toEqual([set("y", 9)]);
  });

  it("deleting a session also drops its sets, like the DB cascade", () => {
    const state = applyOps({ ...empty, sessions: [session], setLogs: [set("x", 10)] }, [{ kind: "delete", table: "sessions", id: "s1" }]);
    expect(state).toEqual(empty);
  });

  it("does not mutate the input state", () => {
    const before: LogState = { ...empty, setLogs: [set("x", 10)] };
    applyOps(before, [{ kind: "delete", table: "set_logs", id: "x" }]);
    expect(before.setLogs).toHaveLength(1);
  });
});
