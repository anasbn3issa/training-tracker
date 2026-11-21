// Reading the user's program: which day is on which weekday, which exercises a day holds. Pure, no I/O.

import type { Program, ProgramDay, ProgramExercise } from "./types";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Days of the active program, in the program's own order (by code). */
export function activeDays(program: Program): ProgramDay[] {
  return program.days.filter((d) => d.program_id === program.active?.id).sort((a, b) => a.code.localeCompare(b.code));
}

/** The day planned on `weekday` (1 = Monday … 7 = Sunday), or null on a rest day. */
export function scheduledDay(program: Program, weekday: number): ProgramDay | null {
  const entry = program.schedule.find((s) => s.weekday === weekday);
  return program.days.find((d) => d.id === entry?.day_id) ?? null;
}

/** Weekdays (1–7) on which the active program plans `dayId`. */
export function weekdaysOf(program: Program, dayId: string): number[] {
  return program.schedule
    .filter((s) => s.day_id === dayId)
    .map((s) => s.weekday)
    .sort((a, b) => a - b);
}

/** "Mon · Thu", or "Not in your week" for a day with no weekday. */
export function formatWeekdays(weekdays: number[]): string {
  if (weekdays.length === 0) return "Not in your week";
  return weekdays.map((w) => WEEKDAYS[w - 1].slice(0, 3)).join(" · ");
}

/** A day's exercises, in order. */
export function dayPrescriptions(program: Program, dayId: string | null): ProgramExercise[] {
  return program.prescriptions.filter((p) => p.day_id === dayId).sort((a, b) => a.position - b.position);
}
