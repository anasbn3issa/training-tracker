import type { Tables } from "./database.types";

export type Exercise = Tables<"exercises">;
export type ProgramDay = Tables<"program_days">;
export type ProgramExercise = Tables<"program_exercises">;
/** One weekday of the active program's week. A weekday with no entry is a rest day. */
export type ScheduleEntry = Pick<Tables<"program_schedule">, "weekday" | "day_id">;
export type ProgramSummary = Pick<Tables<"programs">, "id" | "name" | "template_id">;
// user_id never leaves the server: it comes from the login cookie, not from the client.
export type Session = Omit<Tables<"sessions">, "user_id">;
export type SetLog = Tables<"set_logs">;
export type Run = Omit<Tables<"runs">, "user_id">;

/** The user's program, plus what History needs to name sessions logged on earlier programs. */
export type Program = {
  /** null until the user has chosen a program (first login). */
  active: ProgramSummary | null;
  /** Days of every program the user has had, archived ones included. */
  days: ProgramDay[];
  /** Prescriptions of those days. */
  prescriptions: ProgramExercise[];
  /** The active program's week. */
  schedule: ScheduleEntry[];
  /** The whole exercise catalog. */
  exercises: Exercise[];
};

/** A program to choose from, with its default week. */
export type Template = {
  id: string;
  name: string;
  days: ProgramDay[];
  prescriptions: ProgramExercise[];
  schedule: ScheduleEntry[];
};

/** One exercise of a day as edited in the app, in order. */
export type DayExercise = Pick<ProgramExercise, "exercise_id" | "base_sets" | "rep_low" | "rep_high" | "note">;

/** A week as edited on screen: index 0 = Monday … 6 = Sunday, each the code of a day or null for rest. */
export type Week = (string | null)[];

/** A week as sent to the server: only the training weekdays, each naming its day by code. */
export type WeekPlan = { weekday: number; code: string }[];

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
