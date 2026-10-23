import { describe, expect, it } from "vitest";
import { buildRun, formatDuration, formatPace, historyItems, type RunForm } from "./history";
import type { LogState, Program, Run, Session, SetLog } from "./types";

const program: Program = {
  blockStartDate: "2026-09-28",
  days: [
    { code: "A", name: "Chest + Triceps", weekday: 1 },
    { code: "B", name: "Legs", weekday: 3 },
  ],
  exercises: [
    { id: "squat", name: "Squat", load_type: "barbell", increment_kg: 2.5 },
    { id: "leg-press", name: "Leg press", load_type: "machine", increment_kg: 2.5 },
    { id: "old-move", name: "Old move", load_type: "machine", increment_kg: 2.5 },
  ],
  prescriptions: [
    { id: 1, day_code: "B", position: 1, exercise_id: "squat", base_sets: 4, rep_low: 6, rep_high: 8, note: null },
    { id: 2, day_code: "B", position: 2, exercise_id: "leg-press", base_sets: 4, rep_low: 10, rep_high: 12, note: null },
  ],
};

const session = (id: string, date: string, day_code = "B"): Session => ({
  id,
  day_code,
  date,
  block_week: 5,
  notes: null,
  completed_at: `${date}T19:00:00Z`,
});
const set = (session_id: string, exercise_id: string, set_index: number, reps: number): SetLog => ({
  id: `${session_id}-${exercise_id}-${set_index}`,
  session_id,
  exercise_id,
  set_index,
  weight_kg: 80,
  reps,
  done_at: "2026-10-28T18:00:00Z",
});
const run = (id: string, date: string): Run => ({ id, date, kind: "easy", distance_km: 10, duration_sec: 3000, effort: null, notes: null });

describe("historyItems", () => {
  const log: LogState = {
    sessions: [session("b1", "2026-10-21"), session("b2", "2026-10-28")],
    runs: [run("r1", "2026-10-24"), run("r2", "2026-10-28")],
    setLogs: [set("b2", "leg-press", 1, 12), set("b2", "squat", 2, 7), set("b2", "squat", 1, 8), set("b2", "old-move", 1, 10)],
  };

  it("interleaves sessions and runs, newest first", () => {
    expect(historyItems(log, program).map((i) => `${i.date} ${i.kind}`)).toEqual([
      "2026-10-28 session",
      "2026-10-28 run",
      "2026-10-24 run",
      "2026-10-21 session",
    ]);
  });

  it("a session carries its day name and logged sets per exercise, in program order", () => {
    const first = historyItems(log, program)[0];
    if (first.kind !== "session") throw new Error("expected a session");
    expect(first.dayName).toBe("Legs");
    expect(first.exercises.map((e) => [e.name, e.sets.map((s) => s.reps)])).toEqual([
      ["Squat", [8, 7]],
      ["Leg press", [12]],
      ["Old move", [10]], // no longer in the program: listed last
    ]);
  });
});

describe("run formatting", () => {
  it("formats duration as m:ss, or h:mm:ss past an hour", () => {
    expect(formatDuration(45 * 60)).toBe("45:00");
    expect(formatDuration(5 * 60 + 7)).toBe("5:07");
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("derives pace per km", () => {
    expect(formatPace(10, 3000)).toBe("5:00 /km");
    expect(formatPace(8.4, 2700)).toBe("5:21 /km");
    expect(formatPace(21.1, 6330)).toBe("5:00 /km");
  });
});

describe("buildRun", () => {
  const form: RunForm = { date: "2026-10-24", kind: "long", distance: "12,5", minutes: "65", seconds: "30", effort: 6, notes: " felt good " };

  it("builds a run from the form, accepting a comma decimal", () => {
    expect(buildRun(form, "id-1")).toEqual({
      id: "id-1",
      date: "2026-10-24",
      kind: "long",
      distance_km: 12.5,
      duration_sec: 65 * 60 + 30,
      effort: 6,
      notes: "felt good",
    });
  });

  it("empty seconds and notes are fine; no effort is null", () => {
    const r = buildRun({ ...form, seconds: "", notes: "  ", effort: null }, "id-1");
    expect(r?.duration_sec).toBe(65 * 60);
    expect(r?.notes).toBeNull();
    expect(r?.effort).toBeNull();
  });

  it("rejects a missing distance or duration", () => {
    expect(buildRun({ ...form, distance: "" }, "id-1")).toBeNull();
    expect(buildRun({ ...form, distance: "0" }, "id-1")).toBeNull();
    expect(buildRun({ ...form, minutes: "", seconds: "" }, "id-1")).toBeNull();
    expect(buildRun({ ...form, seconds: "75" }, "id-1")).toBeNull();
  });
});
