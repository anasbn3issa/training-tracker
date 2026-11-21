import { currentUser, unauthorized } from "@/lib/current-user";
import { loadPrograms } from "@/lib/program-db";
import { db } from "@/lib/supabase";
import type { Template } from "@/lib/types";

/** The programs a user can choose from, with their default week. */
export async function GET() {
  if (!(await currentUser())) return unauthorized();
  try {
    const templates: Template[] = (await loadPrograms(db(), null)).map(({ id, name, days, prescriptions, schedule }) => ({
      id,
      name,
      days,
      prescriptions,
      schedule,
    }));
    return Response.json(templates);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
