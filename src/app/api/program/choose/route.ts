import { z } from "zod";
import { currentUser, unauthorized } from "@/lib/current-user";
import { writeFailed } from "@/lib/program-db";
import { isoDate, weekPlan } from "@/lib/program-schemas";
import { db } from "@/lib/supabase";

const body = z.object({
  templateId: z.uuid(),
  week: weekPlan,
  /** Monday of the user's current week, from the device: the new block starts there. */
  blockStart: isoDate,
});

/**
 * Switches the user to a template (or picks their first one). The current program is archived,
 * never deleted; choosing a template used before brings that copy back, swaps included.
 */
export async function POST(request: Request) {
  const userId = await currentUser();
  if (!userId) return unauthorized();

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });

  const { templateId, week, blockStart } = parsed.data;
  const { error } = await db().rpc("choose_program", { p_user: userId, p_template: templateId, p_schedule: week, p_block_start: blockStart });
  if (error) return writeFailed(error);
  return Response.json({ ok: true });
}
