import { describe, expect, it } from "vitest";
import { activeDays, addExercise, editableDay, removeExercise, swapExercise, dayPrescriptions, formatWeekdays, mondayOf, planFromWeek, scheduledDay, weekFromSchedule, weekdaysOf } from "./program";
import type { Program, ProgramExercise } from "./types";

const rx = (id: number, day_id: string, position: number, exercise_id: string): ProgramExercise => ({
  id,
  day_id,
  position,
  exercise_id,
  base_sets: 3,
  rep_low: 8,
  rep_high: 12,
  note: null,
});

// PPL with Push and Pull twice a week; "old" is a day of a program the user switched away from.
const program: Program = {
  active: { id: "ppl", name: "Push / Pull / Legs", template_id: "t-ppl" },
  days: [
    { id: "pull", program_id: "ppl", code: "Pl", name: "Pull" },
    { id: "push", program_id: "ppl", code: "Pu", name: "Push" },
    { id: "legs", program_id: "ppl", code: "L", name: "Legs" },
    { id: "old", program_id: "bro", code: "A", name: "Chest + Triceps" },
  ],
  prescriptions: [rx(1, "push", 2, "dips"), rx(2, "push", 1, "flat-db-press"), rx(3, "old", 1, "cable-fly")],
  schedule: [
    { weekday: 4, day_id: "push" },
    { weekday: 1, day_id: "push" },
    { weekday: 2, day_id: "pull" },
  ],
  exercises: [],
};

describe("program", () => {
  it("activeDays leaves out days of archived programs, in week order", () => {
    expect(activeDays(program).map((d) => d.id)).toEqual(["push", "pull", "legs"]);
  });

  it("scheduledDay finds the day planned on a weekday, null on a rest day", () => {
    expect(scheduledDay(program, 4)?.name).toBe("Push");
    expect(scheduledDay(program, 2)?.name).toBe("Pull");
    expect(scheduledDay(program, 7)).toBeNull();
  });

  it("a day can repeat in the week", () => {
    expect(weekdaysOf(program, "push")).toEqual([1, 4]);
    expect(formatWeekdays(weekdaysOf(program, "push"))).toBe("Mon · Thu");
    expect(formatWeekdays(weekdaysOf(program, "legs"))).toBe("Not in your week");
  });

  it("dayPrescriptions returns a day's exercises in position order", () => {
    expect(dayPrescriptions(program, "push").map((p) => p.exercise_id)).toEqual(["flat-db-press", "dips"]);
    expect(dayPrescriptions(program, null)).toEqual([]);
  });
});

describe("week editing", () => {
  it("weekFromSchedule lays the schedule out Monday to Sunday by day code", () => {
    expect(weekFromSchedule(program.schedule, program.days)).toEqual(["Pu", "Pl", null, "Pu", null, null, null]);
  });

  it("planFromWeek keeps the training days only", () => {
    expect(planFromWeek(["Pu", null, "Lg", null, null, null, "Pu"])).toEqual([
      { weekday: 1, code: "Pu" },
      { weekday: 3, code: "Lg" },
      { weekday: 7, code: "Pu" },
    ]);
  });

  it("mondayOf gives the Monday of the current week", () => {
    expect(mondayOf("2026-11-21")).toBe("2026-11-16"); // a Saturday
    expect(mondayOf("2026-11-16")).toBe("2026-11-16");
    expect(mondayOf("2026-11-22")).toBe("2026-11-16"); // Sunday ends the week
  });
});

describe("day editing", () => {
  const day = editableDay([{ ...rx(1, "push", 1, "flat-db-press"), base_sets: 4, rep_low: 6, rep_high: 10 }, { ...rx(2, "push", 2, "dips"), note: "slow" }]);

  it("a swap keeps the slot's sets and reps and drops its note", () => {
    expect(swapExercise(day, 1, "rope-pushdown")[1]).toEqual({ exercise_id: "rope-pushdown", base_sets: 3, rep_low: 8, rep_high: 12, note: null });
    expect(swapExercise(day, 0, "barbell-bench-press")[0]).toMatchObject({ exercise_id: "barbell-bench-press", base_sets: 4, rep_low: 6, rep_high: 10 });
  });

  it("an added exercise goes last with 3 × 8–12", () => {
    expect(addExercise(day, "cable-fly").at(-1)).toEqual({ exercise_id: "cable-fly", base_sets: 3, rep_low: 8, rep_high: 12, note: null });
  });

  it("removing keeps the others in order", () => {
    expect(removeExercise(day, 0).map((r) => r.exercise_id)).toEqual(["dips"]);
  });
});
