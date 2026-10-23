import { db } from "@/lib/supabase";

export async function GET() {
  const supabase = db();
  const [days, prescriptions, exercises, settings] = await Promise.all([
    supabase.from("program_days").select("*").order("weekday"),
    supabase.from("program_exercises").select("*").order("day_code").order("position"),
    supabase.from("exercises").select("*"),
    supabase.from("settings").select("block_start_date").single(),
  ]);

  const error = days.error ?? prescriptions.error ?? exercises.error ?? settings.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!settings.data) return Response.json({ error: "settings row missing" }, { status: 500 });

  return Response.json({
    days: days.data,
    prescriptions: prescriptions.data,
    exercises: exercises.data,
    blockStartDate: settings.data.block_start_date,
  });
}
