import type { Suggestion } from "./progression";
import type { Exercise, SetLog } from "./types";

export const REST_SECONDS = 90;
export const WEIGHT_STEP_KG = 2.5;
export const WEIGHT_FINE_STEP_KG = 1;

const roundKg = (kg: number) => Math.round(kg * 100) / 100;

/** From an empty field, + starts at the step size and − keeps it empty. */
export function stepWeight(weightKg: number | null, delta: number): number | null {
  if (weightKg === null) return delta > 0 ? delta : null;
  return Math.max(0, roundKg(weightKg + delta));
}

export const stepReps = (reps: number, delta: number) => Math.max(0, reps + delta);

/** Pre-filled values for the next set: set 1 from the suggestion, later sets from the set just logged. */
export function nextSetDefaults(suggestion: Suggestion, loggedThisSession: SetLog[]) {
  const last = loggedThisSession.at(-1);
  if (last) return { weightKg: last.weight_kg, reps: last.reps };
  return { weightKg: suggestion.weightKg, reps: suggestion.targetReps[0] };
}

export function setsLoggedFor(setLogs: SetLog[], sessionId: string, exerciseId: string): SetLog[] {
  return setLogs.filter((l) => l.session_id === sessionId && l.exercise_id === exerciseId).sort((a, b) => a.set_index - b.set_index);
}

export function lastLoggedSet(setLogs: SetLog[], sessionId: string): SetLog | null {
  return (
    setLogs
      .filter((l) => l.session_id === sessionId)
      .sort((a, b) => a.done_at.localeCompare(b.done_at))
      .at(-1) ?? null
  );
}

/** Where to land when opening (or resuming) a session. */
export function firstUnfinishedIndex(exercises: { sets: number; logged: number }[]): number {
  const i = exercises.findIndex((e) => e.logged < e.sets);
  return i === -1 ? exercises.length - 1 : i;
}

export function formatLoad(weightKg: number | null, loadType: Exercise["load_type"]): string {
  if (loadType === "bodyweight" || loadType === "bodyweight_plus") {
    return weightKg ? `BW+${weightKg}` : "BW";
  }
  return weightKg === null ? "—" : String(weightKg);
}

/** Compact enough to stay on one line: "27.5 × 10 10 9 8", or "30×9 27.5×10" when loads differ. */
export function formatSets(sets: { weight_kg: number | null; reps: number }[], loadType: Exercise["load_type"]): string {
  if (sets.length === 0) return "—";
  const loads = sets.map((s) => formatLoad(s.weight_kg, loadType));
  if (loads.every((l) => l === loads[0])) return `${loads[0]} × ${sets.map((s) => s.reps).join(" ")}`;
  return sets.map((s, i) => `${loads[i]}×${s.reps}`).join(" ");
}
