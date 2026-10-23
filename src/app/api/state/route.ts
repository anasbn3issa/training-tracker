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

export async function GET() {
  const supabase = db();
  try {
    const [sessions, setLogs, runs] = await Promise.all([
      fetchAll((from, to) => supabase.from("sessions").select("*").order("id").range(from, to)),
      fetchAll((from, to) => supabase.from("set_logs").select("*").order("id").range(from, to)),
      fetchAll((from, to) => supabase.from("runs").select("*").order("id").range(from, to)),
    ]);
    const state: LogState = { sessions, setLogs, runs };
    return Response.json(state);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
