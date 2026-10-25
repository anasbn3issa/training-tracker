"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "../icons";
import { GhostButton, PrimaryButton, card } from "../ui";
import type { Op, Session } from "@/lib/types";

const SAVE_DELAY_MS = 800;

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** A custom workout: just a title and notes, then Finish. */
export function CustomSession({ session, apply }: { session: Session; apply: (ops: Op[]) => void }) {
  const router = useRouter();
  const [notes, setNotes] = useState(session.notes ?? "");
  const saved = session.notes ?? "";

  // Save notes shortly after typing stops, so closing the app never loses them.
  useEffect(() => {
    if (notes === saved) return;
    const id = setTimeout(() => apply([{ kind: "upsert", table: "sessions", row: { ...session, notes: notes || null } }]), SAVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [notes, saved, session, apply]);

  const empty = notes.trim() === "";

  function finish() {
    apply([{ kind: "upsert", table: "sessions", row: { ...session, notes: notes.trim() || null, completed_at: new Date().toISOString() } }]);
    router.replace("/");
  }

  // Nothing written yet: nothing to lose.
  function cancel() {
    apply([{ kind: "delete", table: "sessions", id: session.id }]);
    router.replace("/");
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between">
        <Link href="/" className="-ml-1 flex h-12 items-center gap-0.5 pr-1 text-[15px] font-medium text-fg-2">
          <ChevronLeftIcon className="size-5" />
          Today
        </Link>
        {empty && (
          <GhostButton onClick={cancel} className="px-2">
            Cancel
          </GhostButton>
        )}
      </header>

      <div>
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">{session.title}</h1>
        <p className="mt-1 text-fg-2">Custom workout · {formatDate(session.date)}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="custom-notes" className="text-sm font-medium text-fg-2">
          Notes
        </label>
        <textarea
          id="custom-notes"
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you do? How did it feel?"
          className={`${card} w-full p-4 text-lg outline-none placeholder:text-fg-3 focus:border-accent`}
        />
      </div>

      <PrimaryButton onClick={finish} className="mt-auto min-h-[72px] text-[22px]">
        Finish
      </PrimaryButton>
    </main>
  );
}
