import { describe, expect, it } from "vitest";
import type { Suggestion } from "./progression";
import { firstUnfinishedIndex, formatLoad, formatSets, lastLoggedSet, nextSetDefaults, setsLoggedFor, stepReps, stepWeight } from "./session";
import type { SetLog } from "./types";

const log = (id: string, exercise_id: string, set_index: number, weight_kg: number | null, reps: number, done_at: string): SetLog => ({
  id,
  session_id: "s1",
  exercise_id,
  set_index,
  weight_kg,
  reps,
  done_at,
});

const suggestion: Suggestion = {
  sets: 4,
  effortCue: "",
  weightKg: 30,
  targetReps: [10, 10, 9, 8],
  advanced: false,
  lastSets: [],
};

describe("stepWeight", () => {
  it("steps and rounds to avoid float drift", () => {
    expect(stepWeight(27.5, 2.5)).toBe(30);
    expect(stepWeight(10.1, 1)).toBe(11.1);
    expect(stepWeight(30, -1)).toBe(29);
  });

  it("never goes below 0", () => {
    expect(stepWeight(1, -2.5)).toBe(0);
  });

  it("from empty: + starts at the step, − stays empty", () => {
    expect(stepWeight(null, 2.5)).toBe(2.5);
    expect(stepWeight(null, 1)).toBe(1);
    expect(stepWeight(null, -2.5)).toBeNull();
  });
});

describe("stepReps", () => {
  it("steps by the delta and never goes below 0", () => {
    expect(stepReps(8, 1)).toBe(9);
    expect(stepReps(0, -1)).toBe(0);
  });
});

describe("nextSetDefaults", () => {
  it("first set: suggested weight and first target", () => {
    expect(nextSetDefaults(suggestion, [])).toEqual({ weightKg: 30, reps: 10 });
  });

  it("later sets: the weight and reps just logged", () => {
    const logged = [log("a", "x", 1, 27.5, 12, "t1"), log("b", "x", 2, 27.5, 11, "t2")];
    expect(nextSetDefaults(suggestion, logged)).toEqual({ weightKg: 27.5, reps: 11 });
  });

  it("no history: empty weight", () => {
    expect(nextSetDefaults({ ...suggestion, weightKg: null }, []).weightKg).toBeNull();
  });
});

describe("setsLoggedFor / lastLoggedSet", () => {
  const logs = [
    log("b", "squat", 2, 80, 7, "2026-10-28T18:10:00Z"),
    log("a", "squat", 1, 80, 8, "2026-10-28T18:05:00Z"),
    log("c", "leg-press", 1, 120, 12, "2026-10-28T18:20:00Z"),
    { ...log("z", "squat", 1, 70, 8, "2026-10-21T18:05:00Z"), session_id: "other" },
  ];

  it("returns this session's sets for one exercise, in set order", () => {
    expect(setsLoggedFor(logs, "s1", "squat").map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("lastLoggedSet is the most recently done set of the session, any exercise", () => {
    expect(lastLoggedSet(logs, "s1")?.id).toBe("c");
    expect(lastLoggedSet(logs, "nope")).toBeNull();
  });
});

describe("firstUnfinishedIndex", () => {
  it("resumes at the first exercise with sets left", () => {
    expect(firstUnfinishedIndex([{ sets: 3, logged: 3 }, { sets: 3, logged: 1 }, { sets: 3, logged: 0 }])).toBe(1);
  });

  it("stays on the last exercise when everything is done", () => {
    expect(firstUnfinishedIndex([{ sets: 3, logged: 3 }, { sets: 3, logged: 4 }])).toBe(1);
  });
});

describe("formatLoad", () => {
  it("shows kg for loaded exercises", () => {
    expect(formatLoad(27.5, "dumbbell_per_hand")).toBe("27.5");
    expect(formatLoad(80, "barbell")).toBe("80");
  });

  it("shows bodyweight and added weight", () => {
    expect(formatLoad(0, "bodyweight_plus")).toBe("BW");
    expect(formatLoad(null, "bodyweight_plus")).toBe("BW");
    expect(formatLoad(10, "bodyweight_plus")).toBe("BW+10");
    expect(formatLoad(null, "bodyweight")).toBe("BW");
  });

  it("shows a dash for a missing weight on a loaded exercise", () => {
    expect(formatLoad(null, "machine")).toBe("—");
  });
});

describe("formatSets", () => {
  it("same load on every set: load once, then the reps", () => {
    const sets = [10, 10, 9, 8].map((reps) => ({ weight_kg: 10, reps }));
    expect(formatSets(sets, "bodyweight_plus")).toBe("BW+10 × 10 10 9 8");
  });

  it("different loads: each set spelled out", () => {
    expect(
      formatSets(
        [
          { weight_kg: 30, reps: 9 },
          { weight_kg: 27.5, reps: 10 },
        ],
        "dumbbell_per_hand",
      ),
    ).toBe("30×9 27.5×10");
  });

  it("nothing logged: a dash", () => {
    expect(formatSets([], "machine")).toBe("—");
  });
});
