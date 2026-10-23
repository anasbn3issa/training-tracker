import { describe, expect, it } from "vitest";
import { blockWeek, findLastSets, suggest, type LoggedSet, type Prescription } from "./progression";

// 4 x 8-10, like Incline DB press.
const incline: Prescription = { base_sets: 4, rep_low: 8, rep_high: 10, increment_kg: 2.5 };

const sets = (weight: number | null, ...reps: number[]): LoggedSet[] =>
  reps.map((r) => ({ weight_kg: weight, reps: r }));

describe("suggest: double progression", () => {
  it("all sets at rep_high -> adds the increment and targets rep_low", () => {
    const s = suggest(incline, 3, sets(27.5, 10, 10, 10, 10));
    expect(s.weightKg).toBe(30);
    expect(s.targetReps).toEqual([8, 8, 8, 8]);
    expect(s.advanced).toBe(true);
  });

  it("a short set -> same weight, last reps per set as the thing to beat", () => {
    const s = suggest(incline, 3, sets(27.5, 10, 10, 9, 8));
    expect(s.weightKg).toBe(27.5);
    expect(s.targetReps).toEqual([10, 10, 9, 8]);
    expect(s.advanced).toBe(false);
  });

  it("reps above rep_high also count as hitting it", () => {
    expect(suggest(incline, 3, sets(27.5, 11, 10, 10, 12)).weightKg).toBe(30);
  });

  it("no history -> no weight suggestion, reps start at rep_low", () => {
    const s = suggest(incline, 3, []);
    expect(s.weightKg).toBeNull();
    expect(s.targetReps).toEqual([8, 8, 8, 8]);
    expect(s.advanced).toBe(false);
  });

  it("uses the heaviest set as last weight when weights differed", () => {
    const last: LoggedSet[] = [
      { weight_kg: 30, reps: 9 },
      { weight_kg: 27.5, reps: 10 },
    ];
    expect(suggest(incline, 3, last).weightKg).toBe(30);
  });

  it("more sets this week than last time -> extra sets repeat the last set's reps", () => {
    // Week 2 (3 sets) -> week 3 (4 sets).
    expect(suggest(incline, 3, sets(27.5, 10, 9, 8)).targetReps).toEqual([10, 9, 8, 8]);
  });

  it("fewer sets this week than last time -> targets are trimmed", () => {
    // Week 5 (4 sets) -> week 1 of the next block (3 sets).
    expect(suggest(incline, 1, sets(27.5, 10, 9, 8, 8)).targetReps).toEqual([10, 9, 8]);
  });

  it("returns last session's sets for display", () => {
    const last = sets(27.5, 10, 9, 8, 8);
    expect(suggest(incline, 3, last).lastSets).toEqual(last);
  });
});

describe("suggest: week 6 deload", () => {
  it("does not advance the weight even when every set hit rep_high", () => {
    const s = suggest(incline, 6, sets(27.5, 10, 10, 10, 10));
    expect(s.weightKg).toBe(27.5);
    expect(s.advanced).toBe(false);
  });

  it("targets rep_low (4+ reps left), not last week's reps", () => {
    expect(suggest(incline, 6, sets(27.5, 10, 10, 10, 10)).targetReps).toEqual([8, 8]);
  });
});

describe("suggest: week modifiers", () => {
  it.each([
    [1, 3, "Stop 3–4 reps short"],
    [2, 3, "Stop 3–4 reps short"],
    [3, 4, "2–3 reps left"],
    [4, 4, "2–3 reps left"],
    [5, 4, "1–2 on the last set"],
    [6, 2, "Deload — 4+ reps left, same weights"],
  ])("week %i -> %i sets, cue %s", (week, expectedSets, cue) => {
    const s = suggest(incline, week, []);
    expect(s.sets).toBe(expectedSets);
    expect(s.targetReps).toHaveLength(expectedSets);
    expect(s.effortCue).toBe(cue);
  });

  it("week 6 rounds half the base sets up", () => {
    expect(suggest({ ...incline, base_sets: 3 }, 6, []).sets).toBe(2);
  });
});

describe("suggest: increment per load type", () => {
  const allAtTop = (weight: number | null) => sets(weight, 10, 10, 10, 10);

  it("barbell: +2.5 kg", () => {
    expect(suggest({ ...incline, increment_kg: 2.5 }, 3, allAtTop(80)).weightKg).toBe(82.5);
  });

  it("machine: +2.5 kg", () => {
    expect(suggest({ ...incline, increment_kg: 2.5 }, 3, allAtTop(35)).weightKg).toBe(37.5);
  });

  it("dumbbell per hand with a 1 kg increment: +1 kg", () => {
    expect(suggest({ ...incline, increment_kg: 1 }, 3, allAtTop(12)).weightKg).toBe(13);
  });

  it("dumbbell per hand with a 2.5 kg increment: +2.5 kg", () => {
    expect(suggest({ ...incline, increment_kg: 2.5 }, 3, allAtTop(25)).weightKg).toBe(27.5);
  });

  it("bodyweight plus: added weight goes up, starting from bodyweight only (0)", () => {
    expect(suggest({ ...incline, increment_kg: 2.5 }, 3, allAtTop(0)).weightKg).toBe(2.5);
    expect(suggest({ ...incline, increment_kg: 2.5 }, 3, allAtTop(10)).weightKg).toBe(12.5);
  });

  it("pure bodyweight: no weight to add, keeps chasing last reps", () => {
    const s = suggest({ ...incline, increment_kg: 2.5 }, 3, allAtTop(null));
    expect(s.weightKg).toBeNull();
    expect(s.targetReps).toEqual([10, 10, 10, 10]);
    expect(s.advanced).toBe(false);
  });

  it("does not accumulate floating point error", () => {
    expect(suggest({ ...incline, increment_kg: 1 }, 3, allAtTop(10.1)).weightKg).toBe(11.1);
  });
});

describe("findLastSets", () => {
  const sessions = [
    { id: "b-old", day_code: "B", date: "2026-10-07", completed_at: "2026-10-07T19:00:00Z" },
    { id: "b-new", day_code: "B", date: "2026-10-14", completed_at: "2026-10-14T19:00:00Z" },
    { id: "d-newer", day_code: "D", date: "2026-10-17", completed_at: "2026-10-17T11:00:00Z" },
    { id: "b-open", day_code: "B", date: "2026-10-21", completed_at: null },
  ];
  const log = (session_id: string, exercise_id: string, set_index: number, weight_kg: number, reps: number) => ({
    session_id,
    exercise_id,
    set_index,
    weight_kg,
    reps,
  });
  const logs = [
    log("b-old", "seated-leg-curl", 1, 40, 12),
    log("b-new", "seated-leg-curl", 2, 45, 10),
    log("b-new", "seated-leg-curl", 1, 45, 11),
    log("b-new", "squat", 1, 80, 8),
    log("d-newer", "seated-leg-curl", 1, 35, 12),
    log("b-open", "seated-leg-curl", 1, 47.5, 9),
  ];

  it("returns the sets of the most recent completed session of the same day, ordered by set_index", () => {
    expect(findLastSets(sessions, logs, "B", "seated-leg-curl")).toEqual([
      { weight_kg: 45, reps: 11 },
      { weight_kg: 45, reps: 10 },
    ]);
  });

  it("ignores the same exercise on another day", () => {
    expect(findLastSets(sessions, logs, "D", "seated-leg-curl")).toEqual([{ weight_kg: 35, reps: 12 }]);
  });

  it("skips sessions that do not contain the exercise", () => {
    const withoutCurl = [...sessions, { id: "b-latest", day_code: "B", date: "2026-10-28", completed_at: "2026-10-28T19:00:00Z" }];
    const latestLogs = [...logs, log("b-latest", "squat", 1, 82.5, 6)];
    expect(findLastSets(withoutCurl, latestLogs, "B", "seated-leg-curl")).toHaveLength(2);
  });

  it("returns an empty list when there is no history", () => {
    expect(findLastSets(sessions, logs, "C", "pull-ups")).toEqual([]);
  });
});

describe("blockWeek", () => {
  const start = "2026-09-28"; // a Monday

  it.each([
    ["2026-09-28", 1],
    ["2026-10-04", 1], // Sunday of week 1
    ["2026-10-05", 2],
    ["2026-10-23", 4],
    ["2026-10-26", 5],
    ["2026-11-02", 6],
    ["2026-11-09", 1], // next block
    ["2026-12-21", 1], // two blocks later
  ])("%s -> week %i", (date, week) => {
    expect(blockWeek(start, date)).toBe(week);
  });

  it("dates before the block start still land in 1-6", () => {
    expect(blockWeek(start, "2026-09-21")).toBe(6);
  });
});
