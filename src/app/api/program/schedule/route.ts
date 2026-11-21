import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/current-user";
import { activeProgramId, writeFailed } from "@/lib/program-db";
import { weekPlan } from "@/lib/program-schemas";
import { db } from "@/lib/supabase";

const body = z.object({ week: weekPlan });

/** Replaces the active program's week. */
export async function PUT(request: Request) {
  const userId = await currentUser();
  if (!userId) return unauthorized();

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });

  const supabase = db();
  const programId = await activeProgramId(supabase, userId);
  if (!programId) return Response.json({ error: "no program chosen yet" }, { status: 409 });

  const { error } = await supabase.rpc("set_schedule", { p_program: programId, p_schedule: parsed.data.week });
  if (error) return writeFailed(error);
  return Response.json({ ok: true });
}
