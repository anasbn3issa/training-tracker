// Double progression + 6-week block modifiers. Pure functions, no I/O.

import { addDays } from "./today";

export type LoggedSet = { weight_kg: number | null; reps: number };

export type Prescription = { base_sets: number; rep_low: number; rep_high: number; increment_kg: number };

export type Suggestion = {
  sets: number;
  effortCue: string;
  /** Pre-filled weight. null = no history (or pure bodyweight): leave the field empty. */
  weightKg: number | null;
  /** Pre-filled reps, one per set. */
  targetReps: number[];
  /** True when the weight went up because every set hit rep_high. */
  advanced: boolean;
  /** Last session's actual numbers, for display. */
  lastSets: LoggedSet[];
};

type SessionRef = { id: string; day_code: string | null; date: string; completed_at: string | null };
type SetRef = LoggedSet & { session_id: string; exercise_id: string; set_index: number };

const DELOAD_WEEK = 6;

const WEEKS: Record<number, { sets: (base: number) => number; cue: string }> = {
  1: { sets: (b) => b - 1, cue: "Stop 3–4 reps short" },
  2: { sets: (b) => b - 1, cue: "Stop 3–4 reps short" },
  3: { sets: (b) => b, cue: "2–3 reps left" },
  4: { sets: (b) => b, cue: "2–3 reps left" },
  5: { sets: (b) => b, cue: "1–2 on the last set" },
  6: { sets: (b) => Math.ceil(b / 2), cue: "Deload — 4+ reps left, same weights" },
};

const roundKg = (kg: number) => Math.round(kg * 100) / 100;

export const setsForWeek = (baseSets: number, week: number) => WEEKS[week].sets(baseSets);
export const effortCue = (week: number) => WEEKS[week].cue;

export function suggest(rx: Prescription, week: number, lastSets: LoggedSet[]): Suggestion {
  const sets = setsForWeek(rx.base_sets, week);

  const weights = lastSets.map((s) => s.weight_kg).filter((w) => w !== null);
  const lastWeight = weights.length > 0 ? Math.max(...weights) : null;
  const hitTop = lastSets.length > 0 && lastSets.every((s) => s.reps >= rx.rep_high);
  const advanced = hitTop && lastWeight !== null && week !== DELOAD_WEEK;

  const weightKg = advanced ? roundKg(lastWeight + rx.increment_kg) : lastWeight;

  const chaseLastReps = !advanced && week !== DELOAD_WEEK && lastSets.length > 0;
  const targetReps = Array.from({ length: sets }, (_, i) =>
    chaseLastReps ? lastSets[Math.min(i, lastSets.length - 1)].reps : rx.rep_low,
  );

  return { sets, effortCue: effortCue(week), weightKg, targetReps, advanced, lastSets };
}

/**
 * Sets of the most recent completed session of `dayCode` that contains the exercise.
 * Scoped to the same day so a lighter repeat on another day (e.g. Saturday's
 * leg curl at ~80%) doesn't drive the main day's progression.
 */
export function findLastSets(sessions: SessionRef[], setLogs: SetRef[], dayCode: string, exerciseId: string): LoggedSet[] {
  const candidates = sessions
    .filter((s) => s.day_code === dayCode && s.completed_at !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  for (const session of candidates) {
    const sets = setLogs
      .filter((l) => l.session_id === session.id && l.exercise_id === exerciseId)
      .sort((a, b) => a.set_index - b.set_index);
    if (sets.length > 0) return sets.map(({ weight_kg, reps }) => ({ weight_kg, reps }));
  }
  return [];
}

const dayNumber = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** The block start that makes `today` fall in `week`, keeping the start's weekday. */
export function shiftBlockStart(blockStartDate: string, today: string, week: number): string {
  const delta = week - blockWeek(blockStartDate, today);
  return addDays(blockStartDate, -7 * delta);
}

/** Week 1-6 of the block containing `date`; blocks repeat every 6 weeks. */
export function blockWeek(blockStartDate: string, date: string): number {
  const weeks = Math.floor((dayNumber(date) - dayNumber(blockStartDate)) / 7);
  return (((weeks % 6) + 6) % 6) + 1;
}
