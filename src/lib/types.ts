import type { Tables } from "./database.types";

export type Exercise = Tables<"exercises">;
export type ProgramDay = Tables<"program_days">;
export type ProgramExercise = Tables<"program_exercises">;
// user_id never leaves the server: it comes from the login cookie, not from the client.
export type Session = Omit<Tables<"sessions">, "user_id">;
export type SetLog = Tables<"set_logs">;
export type Run = Omit<Tables<"runs">, "user_id">;

/** The shared program, the same for every user. */
export type Program = {
  days: ProgramDay[];
  prescriptions: ProgramExercise[];
  exercises: Exercise[];
};

/** Everything one user logged, plus their block start. Pulled from the server, mutated locally through ops. */
export type LogState = {
  sessions: Session[];
  setLogs: SetLog[];
  runs: Run[];
  /** Monday of week 1 of the user's current 6-week block. */
  blockStartDate: string;
};

export type SyncTable = "sessions" | "set_logs" | "runs";

/** A single write. Replayed in order against local state and the server. */
export type Op =
  | { kind: "upsert"; table: "sessions"; row: Session }
  | { kind: "upsert"; table: "set_logs"; row: SetLog }
  | { kind: "upsert"; table: "runs"; row: Run }
  | { kind: "delete"; table: SyncTable; id: string }
  | { kind: "set_block_start"; date: string };
