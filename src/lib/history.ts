import type { Exercise, LogState, Program, Run, Session, SetLog } from "./types";

export type HistoryItem =
  | {
      kind: "session";
      date: string;
      session: Session;
      dayName: string;
      exercises: { id: string; name: string; loadType: Exercise["load_type"]; sets: SetLog[] }[];
    }
  | { kind: "run"; date: string; run: Run };

/** Sessions and runs interleaved, newest first. On the same date, sessions come before runs. */
export function historyItems(log: LogState, program: Program): HistoryItem[] {
  const sessions: HistoryItem[] = log.sessions.map((session) => {
    const position = (exerciseId: string) =>
      program.prescriptions.find((p) => p.day_code === session.day_code && p.exercise_id === exerciseId)?.position ?? Infinity;
    const sets = log.setLogs.filter((l) => l.session_id === session.id);
    const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))].sort((a, b) => position(a) - position(b));
    return {
      kind: "session",
      date: session.date,
      session,
      dayName:
        session.day_code === null
          ? (session.title ?? "Custom workout")
          : (program.days.find((d) => d.code === session.day_code)?.name ?? session.day_code),
      exercises: exerciseIds.map((id) => {
        const exercise = program.exercises.find((e) => e.id === id);
        return {
          id,
          name: exercise?.name ?? id,
          loadType: exercise?.load_type ?? "machine",
          sets: sets.filter((s) => s.exercise_id === id).sort((a, b) => a.set_index - b.set_index),
        };
      }),
    };
  });
  const runs: HistoryItem[] = log.runs.map((run) => ({ kind: "run", date: run.date, run }));

  return [...sessions, ...runs].sort((a, b) => b.date.localeCompare(a.date) || (a.kind === b.kind ? 0 : a.kind === "session" ? -1 : 1));
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Pace is derived, never stored. */
export function formatPace(distanceKm: number, durationSec: number): string {
  const secPerKm = Math.round(durationSec / distanceKm);
  return `${Math.floor(secPerKm / 60)}:${pad(secPerKm % 60)} /km`;
}

export type RunForm = {
  date: string;
  kind: Run["kind"];
  distance: string;
  minutes: string;
  seconds: string;
  effort: number | null;
  notes: string;
};

const toNumber = (raw: string) => (raw.trim() === "" ? 0 : Number(raw.replace(",", ".")));

/** The run to save, or null while the form isn't valid yet. */
export function buildRun(form: RunForm, id: string): Run | null {
  const distance = toNumber(form.distance);
  const minutes = toNumber(form.minutes);
  const seconds = toNumber(form.seconds);
  if (!Number.isFinite(distance) || distance <= 0) return null;
  if (!Number.isInteger(minutes) || minutes < 0 || !Number.isInteger(seconds) || seconds < 0 || seconds > 59) return null;
  const duration = minutes * 60 + seconds;
  if (duration <= 0) return null;

  return {
    id,
    date: form.date,
    kind: form.kind,
    distance_km: distance,
    duration_sec: duration,
    effort: form.effort,
    notes: form.notes.trim() || null,
  };
}
