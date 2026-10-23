import type { LogState, Op } from "./types";

const upsert = <T extends { id: string }>(rows: T[], row: T) => [...rows.filter((r) => r.id !== row.id), row];

/** Applies ops in order and returns a new state. Mirrors what the server does. */
export function applyOps(state: LogState, ops: Op[]): LogState {
  return ops.reduce<LogState>((s, op) => {
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
