import "server-only";
import type { db } from "./supabase";
import type { ProgramDay, ProgramExercise, ScheduleEntry } from "./types";

type Supabase = ReturnType<typeof db>;

export type StoredProgram = {
  id: string;
  name: string;
  slug: string | null;
  template_id: string | null;
  archived_at: string | null;
  days: ProgramDay[];
  prescriptions: ProgramExercise[];
  schedule: ScheduleEntry[];
};

// program_days and programs are also linked through program_schedule, so the embeds name their foreign key.
const SELECT = `id, name, slug, template_id, archived_at,
  program_days!program_days_program_id_fkey(id, program_id, code, name, program_exercises(*)),
  program_schedule!program_schedule_program_id_fkey(weekday, day_id)`;

/** Programs with their days, prescriptions and week: the user's own (`userId`), or the templates (null). */
export async function loadPrograms(supabase: Supabase, userId: string | null): Promise<StoredProgram[]> {
  const query = supabase.from("programs").select(SELECT).order("created_at");
  const { data, error } = await (userId === null ? query.is("user_id", null) : query.eq("user_id", userId));
  if (error) throw new Error(error.message);
  return data.map(({ program_days, program_schedule, ...program }) => ({
    ...program,
    days: program_days.map((d) => ({ id: d.id, program_id: d.program_id, code: d.code, name: d.name })),
    prescriptions: program_days.flatMap((d) => d.program_exercises),
    schedule: program_schedule,
  }));
}

/** True when the day belongs to one of the user's programs (active or archived). */
export async function ownsDay(supabase: Supabase, userId: string, dayId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("program_days")
    .select("id, programs!program_days_program_id_fkey!inner(user_id)")
    .eq("id", dayId)
    .eq("programs.user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}
