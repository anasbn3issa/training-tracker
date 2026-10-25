"use client";

import Link from "next/link";
import { useData } from "@/components/data-provider";
import { Loading } from "@/components/ui";
import { ActiveSession } from "@/components/session/active-session";
import { CustomSession } from "@/components/session/custom-session";
import { findInProgress, localIsoDate } from "@/lib/today";

export default function SessionPage() {
  const { program, log, ready, apply } = useData();
  if (!ready || !program) return <Loading />;

  const session = findInProgress(log.sessions, localIsoDate(new Date()));
  if (!session) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-xl font-semibold">No session in progress.</p>
        <Link href="/" className="font-semibold text-accent">
          Back to Today
        </Link>
      </main>
    );
  }
  // key: a new session starts from a fresh screen state.
  if (session.day_code === null) return <CustomSession key={session.id} session={session} apply={apply} />;
  return <ActiveSession key={session.id} session={session} dayCode={session.day_code} program={program} log={log} apply={apply} />;
}
