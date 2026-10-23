"use client";

import Link from "next/link";
import { useData } from "@/components/data-provider";
import { ActiveSession } from "@/components/session/active-session";
import { findInProgress, localIsoDate } from "@/lib/today";

export default function SessionPage() {
  const { program, log, ready, apply } = useData();
  if (!ready || !program) return <p className="p-4 text-zinc-500">Loading…</p>;

  const session = findInProgress(log.sessions, localIsoDate(new Date()));
  if (!session) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-xl">No session in progress.</p>
        <Link href="/" className="text-lime-400 underline">
          Back to Today
        </Link>
      </main>
    );
  }
  // key: a new session starts from a fresh screen state.
  return <ActiveSession key={session.id} session={session} program={program} log={log} apply={apply} />;
}
