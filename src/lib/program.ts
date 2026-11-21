// Reading the user's program: which day is on which weekday, which exercises a day holds. Pure, no I/O.

import { addDays, isoWeekday } from "./today";
import type { DayExercise, Program, ProgramDay, ProgramExercise, ScheduleEntry, Week, WeekPlan } from "./types";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Days in the order the week runs through them (Push, Pull, Legs); days not in the week come last. */
export function orderDays(days: ProgramDay[], schedule: ScheduleEntry[]): ProgramDay[] {
  const first = (d: ProgramDay) => Math.min(...schedule.filter((s) => s.day_id === d.id).map((s) => s.weekday));
  return [...days].sort((a, b) => first(a) - first(b) || a.code.localeCompare(b.code));
}

/** Days of the active program, in week order. */
export function activeDays(program: Program): ProgramDay[] {
  return orderDays(
    program.days.filter((d) => d.program_id === program.active?.id),
    program.schedule,
  );
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
export function dayPrescriptions(program: Pick<Program, "prescriptions">, dayId: string | null): ProgramExercise[] {
  return program.prescriptions.filter((p) => p.day_id === dayId).sort((a, b) => a.position - b.position);
}

/** The week to edit, from a stored schedule. */
export function weekFromSchedule(schedule: ScheduleEntry[], days: ProgramDay[]): Week {
  return WEEKDAYS.map((_, i) => {
    const entry = schedule.find((s) => s.weekday === i + 1);
    return days.find((d) => d.id === entry?.day_id)?.code ?? null;
  });
}

/** The edited week, as sent to the server. */
export function planFromWeek(week: Week): WeekPlan {
  return week.flatMap((code, i) => (code === null ? [] : [{ weekday: i + 1, code }]));
}

/** Monday of the week containing `today`: where a new 6-week block starts. */
export function mondayOf(today: string): string {
  return addDays(today, 1 - isoWeekday(today));
}

/** Sets and reps of an exercise added to a day (not editable in the app). */
export const ADDED_EXERCISE = { base_sets: 3, rep_low: 8, rep_high: 12 };

/** A day's exercises as the editor holds them. */
export function editableDay(prescriptions: ProgramExercise[]): DayExercise[] {
  return prescriptions.map(({ exercise_id, base_sets, rep_low, rep_high, note }) => ({ exercise_id, base_sets, rep_low, rep_high, note }));
}

/** Swapping keeps the slot's sets and reps; the note was about the old exercise, so it goes. */
export function swapExercise(rows: DayExercise[], index: number, exerciseId: string): DayExercise[] {
  return rows.map((r, i) => (i === index ? { ...r, exercise_id: exerciseId, note: null } : r));
}

export function addExercise(rows: DayExercise[], exerciseId: string): DayExercise[] {
  return [...rows, { exercise_id: exerciseId, ...ADDED_EXERCISE, note: null }];
}

export function removeExercise(rows: DayExercise[], index: number): DayExercise[] {
  return rows.filter((_, i) => i !== index);
}
