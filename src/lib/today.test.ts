import { describe, expect, it } from "vitest";
import { addDays, findInProgress, isoWeekday, localIsoDate, runKmLast7Days, staleSessionOps } from "./today";
import type { Run, Session, SetLog } from "./types";

const session = (id: string, date: string, completed_at: string | null = null): Session => ({
  id,
  day_code: "A",
  date,
  block_week: 4,
  notes: null,
  completed_at,
});

const setLog = (session_id: string, done_at: string): SetLog => ({
  id: `${session_id}-${done_at}`,
  session_id,
  exercise_id: "squat",
  set_index: 1,
  weight_kg: 80,
  reps: 8,
  done_at,
});

const run = (date: string, distance_km: number): Run => ({
  id: date,
  date,
  kind: "easy",
  distance_km,
  duration_sec: 1800,
  effort: null,
  notes: null,
});

describe("dates", () => {
  it("localIsoDate uses the device's local calendar date", () => {
    expect(localIsoDate(new Date(2026, 9, 23, 23, 59))).toBe("2026-10-23");
    expect(localIsoDate(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });

  it("isoWeekday: 1 = Monday ... 7 = Sunday", () => {
    expect(isoWeekday("2026-10-26")).toBe(1);
    expect(isoWeekday("2026-10-23")).toBe(5);
    expect(isoWeekday("2026-10-25")).toBe(7);
  });

  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2027-01-02", -6)).toBe("2026-12-27");
  });
});

describe("runKmLast7Days", () => {
  it("sums today and the 6 days before, nothing older or in the future", () => {
    const runs = [run("2026-10-16", 50), run("2026-10-17", 5), run("2026-10-20", 10.5), run("2026-10-23", 8), run("2026-10-24", 99)];
    expect(runKmLast7Days(runs, "2026-10-23")).toBe(23.5);
  });

  it("is 0 with no runs", () => {
    expect(runKmLast7Days([], "2026-10-23")).toBe(0);
  });
});

describe("findInProgress", () => {
  it("returns today's uncompleted session", () => {
    const sessions = [session("done", "2026-10-23", "2026-10-23T10:00:00Z"), session("open", "2026-10-23")];
    expect(findInProgress(sessions, "2026-10-23")?.id).toBe("open");
  });

  it("ignores an uncompleted session from an earlier day", () => {
    expect(findInProgress([session("old", "2026-10-21")], "2026-10-23")).toBeNull();
  });
});

describe("staleSessionOps", () => {
  it("completes an abandoned session at its last logged set", () => {
    const ops = staleSessionOps(
      [session("old", "2026-10-21")],
      [setLog("old", "2026-10-21T18:10:00Z"), setLog("old", "2026-10-21T18:40:00Z")],
      "2026-10-23",
    );
    expect(ops).toEqual([{ kind: "upsert", table: "sessions", row: session("old", "2026-10-21", "2026-10-21T18:40:00Z") }]);
  });

  it("deletes an abandoned session with no sets", () => {
    expect(staleSessionOps([session("empty", "2026-10-21")], [], "2026-10-23")).toEqual([
      { kind: "delete", table: "sessions", id: "empty" },
    ]);
  });

  it("leaves today's and completed sessions alone", () => {
    const sessions = [session("today", "2026-10-23"), session("done", "2026-10-21", "2026-10-21T19:00:00Z")];
    expect(staleSessionOps(sessions, [], "2026-10-23")).toEqual([]);
  });
});
