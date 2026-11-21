import type { LogState, Op, ProgramDay } from "./types";

const upsert = <T extends { id: string }>(rows: T[], row: T) => [...rows.filter((r) => r.id !== row.id), row];

/** Applies ops in order and returns a new state. Mirrors what the server does. */
export function applyOps(state: LogState, ops: Op[]): LogState {
  return ops.reduce<LogState>((s, op) => {
    if (op.kind === "set_block_start") return { ...s, blockStartDate: op.date };
    if (op.kind === "delete") {
      switch (op.table) {
        case "sessions":
          return {
            ...s,
            sessions: s.sessions.filter((r) => r.id !== op.id),
            setLogs: s.setLogs.filter((r) => r.session_id !== op.id),
          };
        case "set_logs":
          return { ...s, setLogs: s.setLogs.filter((r) => r.id !== op.id) };
        case "runs":
          return { ...s, runs: s.runs.filter((r) => r.id !== op.id) };
      }
    }
    switch (op.table) {
      case "sessions":
        return { ...s, sessions: upsert(s.sessions, op.row) };
      case "set_logs":
        return { ...s, setLogs: upsert(s.setLogs, op.row) };
      case "runs":
        return { ...s, runs: upsert(s.runs, op.row) };
    }
  }, state);
}

/**
 * Before per-user programs, a session named its day by a global code (A–D) instead of a day_id.
 * Ops queued back then get the day with that code in the user's oldest program: the copy of the
 * bro split the migration made for them. `days` must be in program creation order, as /api/program
 * sends them. Mirrors the shim in /api/sync; remove both once every phone has synced.
 */
export function upgradeLegacyOps(ops: Op[], days: ProgramDay[]): Op[] {
  return ops.map((op) => {
    if (op.kind !== "upsert" || op.table !== "sessions") return op;
    if (Object.hasOwn(op.row, "day_id") || !Object.hasOwn(op.row, "day_code")) return op;
    const code: unknown = Reflect.get(op.row, "day_code");
    if (code === null) return { ...op, row: { ...op.row, day_id: null } };
    const day = days.find((d) => d.code === code);
    // Unknown code: leave it to the server, which rejects it.
    return day ? { ...op, row: { ...op.row, day_id: day.id } } : op;
  });
}
