import { db } from "@/lib/supabase";
import type { Program } from "@/lib/types";

/** The shared program (same for every user). */
export async function GET() {
  const supabase = db();
  const [days, prescriptions, exercises] = await Promise.all([
    supabase.from("program_days").select("*").order("weekday"),
    supabase.from("program_exercises").select("*").order("day_code").order("position"),
    supabase.from("exercises").select("*"),
  ]);

  const error = days.error ?? prescriptions.error ?? exercises.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const program: Program = { days: days.data ?? [], prescriptions: prescriptions.data ?? [], exercises: exercises.data ?? [] };
  return Response.json(program);
}
