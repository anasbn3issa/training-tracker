import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/current-user";
import { ownsActiveDay, writeFailed } from "@/lib/program-db";
import { dayExercises } from "@/lib/schemas";
import { db } from "@/lib/supabase";

const body = z.object({ exercises: dayExercises });

/** Replaces a day's exercises (swap, add, remove). Logged sets point at exercises, so history is untouched. */
export async function PUT(request: Request, ctx: RouteContext<"/api/program/days/[dayId]">) {
  const userId = await currentUser();
  if (!userId) return unauthorized();

  const { dayId } = await ctx.params;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.uuid().safeParse(dayId).success) {
    return Response.json({ error: parsed.error ? z.prettifyError(parsed.error) : "bad day id" }, { status: 400 });
  }

  const supabase = db();
  if (!(await ownsActiveDay(supabase, userId, dayId))) return Response.json({ error: "not a day of your program" }, { status: 404 });

  const rows = parsed.data.exercises.map((r, i) => ({ ...r, position: i + 1 }));
  const { error } = await supabase.rpc("set_day_exercises", { p_day: dayId, p_rows: rows });
  if (error) return writeFailed(error);
  return Response.json({ ok: true });
}
