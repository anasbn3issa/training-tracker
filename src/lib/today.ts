import type { Op, Run, Session, SetLog } from "./types";

// Dates are ISO "YYYY-MM-DD" strings in the phone's local calendar. The server
// runs in UTC, so "today" must always come from the device.

const pad = (n: number) => String(n).padStart(2, "0");

export const localIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseUtc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** 1 = Monday ... 7 = Sunday, matching program_days.weekday. */
export const isoWeekday = (iso: string) => ((parseUtc(iso).getUTCDay() + 6) % 7) + 1;

export const addDays = (iso: string, days: number) => {
  const d = parseUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Running distance over today and the 6 days before. */
export function runKmLast7Days(runs: Run[], today: string): number {
  const from = addDays(today, -6);
  const km = runs.filter((r) => r.date >= from && r.date <= today).reduce((sum, r) => sum + r.distance_km, 0);
  return Math.round(km * 100) / 100;
}

export function findInProgress(sessions: Session[], today: string): Session | null {
  return sessions.find((s) => s.completed_at === null && s.date === today) ?? null;
}

/**
 * Sessions left in progress on an earlier day: completed at their last logged
 * set, or deleted if nothing was logged. Keeps Today from offering a stale Resume.
 */
export function staleSessionOps(sessions: Session[], setLogs: SetLog[], today: string): Op[] {
  return sessions
    .filter((s) => s.completed_at === null && s.date < today)
    .map((s): Op => {
      const lastDone = setLogs
        .filter((l) => l.session_id === s.id)
        .map((l) => l.done_at)
        .sort()
        .at(-1);
      return lastDone
        ? { kind: "upsert", table: "sessions", row: { ...s, completed_at: lastDone } }
        : { kind: "delete", table: "sessions", id: s.id };
    });
}
