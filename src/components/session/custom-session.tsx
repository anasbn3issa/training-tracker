"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackLink, PrimaryButton } from "../ui";
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
        <BackLink href="/">Today</BackLink>
        {empty && (
          <button onClick={cancel} className="type-label -mr-2 h-12 px-2 text-sm text-fg">
            Cancel
          </button>
        )}
      </header>

      <div>
        <h1 className="type-display text-[52px]">{session.title}</h1>
        <p className="mt-2 text-fg-2">Custom workout · {formatDate(session.date)}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="custom-notes" className="type-label text-xs text-fg-2">
          Notes
        </label>
        <textarea
          id="custom-notes"
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you do? How did it feel?"
          className="w-full border-2 border-line bg-bg p-4 text-lg outline-none placeholder:text-fg-3 focus:border-accent"
        />
      </div>

      <PrimaryButton tall onClick={finish} className="mt-auto">
        Finish
      </PrimaryButton>
    </main>
  );
}
