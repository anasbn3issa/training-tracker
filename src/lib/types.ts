import type { Tables } from "./database.types";

export type Exercise = Tables<"exercises">;
export type ProgramDay = Tables<"program_days">;
export type ProgramExercise = Tables<"program_exercises">;
export type Session = Tables<"sessions">;
export type SetLog = Tables<"set_logs">;
export type Run = Tables<"runs">;

export type Program = {
  days: ProgramDay[];
  prescriptions: ProgramExercise[];
  exercises: Exercise[];
  blockStartDate: string;
};

/** Everything the user logged. Pulled from the server, mutated locally through ops. */
export type LogState = {
  sessions: Session[];
  setLogs: SetLog[];
  runs: Run[];
};

export type SyncTable = "sessions" | "set_logs" | "runs";

/** A single write. Replayed in order against local state and the server. */
export type Op =
  | { kind: "upsert"; table: "sessions"; row: Session }
  | { kind: "upsert"; table: "set_logs"; row: SetLog }
  | { kind: "upsert"; table: "runs"; row: Run }
  | { kind: "delete"; table: SyncTable; id: string };
