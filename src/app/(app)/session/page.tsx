"use client";

import Link from "next/link";
import { useData } from "@/components/data-provider";
import { findInProgress, localIsoDate } from "@/lib/today";

// Placeholder until step 4 (active session screen).
export default function SessionPage() {
  const { log, ready } = useData();
  const session = ready ? findInProgress(log.sessions, localIsoDate(new Date())) : null;
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <p className="text-xl">{session ? `Session ${session.day_code}, week ${session.block_week}` : "No session in progress"}</p>
      <p className="text-zinc-500">Active session screen — step 4</p>
      <Link href="/" className="text-lime-400 underline">
        Back to Today
      </Link>
    </main>
  );
}
