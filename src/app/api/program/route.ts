import { currentUser, unauthorized } from "@/lib/current-user";
import { loadPrograms } from "@/lib/program-db";
import { db } from "@/lib/supabase";
import type { Program } from "@/lib/types";

/** The user's program. Days of archived programs come along so History can still name old sessions. */
export async function GET() {
  const userId = await currentUser();
  if (!userId) return unauthorized();

  const supabase = db();
  try {
    const [programs, exercises] = await Promise.all([loadPrograms(supabase, userId), supabase.from("exercises").select("*").order("name")]);
    if (exercises.error) throw new Error(exercises.error.message);

    const active = programs.find((p) => p.archived_at === null) ?? null;
    const program: Program = {
      active: active && { id: active.id, name: active.name, template_id: active.template_id },
      days: programs.flatMap((p) => p.days),
      prescriptions: programs.flatMap((p) => p.prescriptions),
      schedule: active?.schedule ?? [],
      exercises: exercises.data,
    };
    return Response.json(program);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
