import { currentUser, unauthorized } from "@/lib/current-user";
import { db } from "@/lib/supabase";
import type { LogState } from "@/lib/types";

const PAGE = 1000; // Supabase's default max rows per request

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function fetchAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Everything the logged-in user logged. user_id itself is never sent to the client. */
export async function GET() {
  const userId = await currentUser();
  if (!userId) return unauthorized();

  const supabase = db();
  try {
    const [sessions, setLogs, runs, user] = await Promise.all([
      fetchAll((from, to) =>
        supabase
          .from("sessions")
          .select("id, day_code, title, date, block_week, notes, completed_at")
          .eq("user_id", userId)
          .order("id")
          .range(from, to),
      ),
      fetchAll((from, to) =>
        supabase
          .from("set_logs")
          .select("id, session_id, exercise_id, set_index, weight_kg, reps, done_at, sessions!inner(user_id)")
          .eq("sessions.user_id", userId)
          .order("id")
          .range(from, to),
      ),
      fetchAll((from, to) =>
        supabase
          .from("runs")
          .select("id, date, kind, distance_km, duration_sec, effort, notes")
          .eq("user_id", userId)
          .order("id")
          .range(from, to),
      ),
      supabase.from("users").select("block_start_date").eq("id", userId).single(),
    ]);
    if (user.error) throw new Error(user.error.message);

    const state: LogState = {
      sessions,
      // Drop the join used for filtering by owner.
      setLogs: setLogs.map(({ id, session_id, exercise_id, set_index, weight_kg, reps, done_at }) => ({
        id,
        session_id,
        exercise_id,
        set_index,
        weight_kg,
        reps,
        done_at,
      })),
      runs,
      blockStartDate: user.data.block_start_date,
    };
    return Response.json(state);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
