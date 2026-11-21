import { describe, expect, it } from "vitest";
import { activeDays, dayPrescriptions, formatWeekdays, scheduledDay, weekdaysOf } from "./program";
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
  it("activeDays leaves out days of archived programs", () => {
    expect(activeDays(program).map((d) => d.id)).toEqual(["legs", "pull", "push"]);
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
