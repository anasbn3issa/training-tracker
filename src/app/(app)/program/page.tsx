"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useData } from "@/components/data-provider";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { ChooseProgram } from "@/components/program/choose-program";
import { DayEditor } from "@/components/program/day-editor";
import { WeekEditor } from "@/components/program/week-editor";
import { DayBadge, GhostButton, Loading, PrimaryButton, ScreenTitle, card, eyebrow } from "@/components/ui";
import { activeDays, dayPrescriptions, formatWeekdays, planFromWeek, weekFromSchedule, weekdaysOf } from "@/lib/program";
import { RELOAD_FAILED, failureMessage, saveWeek } from "@/lib/program-api";
import { findInProgress, localIsoDate } from "@/lib/today";
import type { Week } from "@/lib/types";

type View = { kind: "overview" } | { kind: "day"; dayId: string } | { kind: "change" };

/** The user's program: their week, each day's exercises, and switching to another program. */
export default function ProgramPage() {
  const { program, log, ready, refresh } = useData();
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "overview" });
  // null until the week is edited; then the edited week, not yet saved.
  const [week, setWeek] = useState<Week | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready || !program?.active) return <Loading />;

  const days = activeDays(program);
  const shell = (children: ReactNode) => (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</main>
  );
  const back = (
    <Link href="/" className="-ml-1 flex h-12 items-center gap-0.5 self-start pr-1 text-[15px] font-medium text-fg-2">
      <ChevronLeftIcon className="size-5" />
      Today
    </Link>
  );

  // Changing exercises mid-workout would reshuffle the session screen.
  if (findInProgress(log.sessions, localIsoDate(new Date()))) {
    return shell(
      <>
        {back}
        <ScreenTitle>{program.active.name}</ScreenTitle>
        <p className="text-fg-2">Finish your workout first, then come back to change your program.</p>
      </>,
    );
  }

  if (view.kind === "change") {
    return shell(<ChooseProgram switching onDone={() => router.replace("/")} onCancel={() => setView({ kind: "overview" })} />);
  }

  const editedDay = view.kind === "day" ? days.find((d) => d.id === view.dayId) : undefined;
  if (editedDay) return shell(<DayEditor program={program} day={editedDay} onClose={() => setView({ kind: "overview" })} />);

  const shownWeek = week ?? weekFromSchedule(program.schedule, days);
  const trainingDays = planFromWeek(shownWeek).length;

  async function save() {
    if (!week) return;
    setSaving(true);
    setError(null);
    try {
      await saveWeek(planFromWeek(week));
      if (!(await refresh())) throw new Error(RELOAD_FAILED);
      setWeek(null);
    } catch (e) {
      setError(failureMessage(e));
    }
    setSaving(false);
  }

  return shell(
    <>
      {back}
      <div>
        <p className={eyebrow}>Your program</p>
        <ScreenTitle>{program.active.name}</ScreenTitle>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Week</h2>
        <WeekEditor days={days} week={shownWeek} onChange={setWeek} />
        {error && <p className="text-[15px] text-danger">{error}</p>}
        {week && (
          <div className="flex gap-2">
            <GhostButton onClick={() => setWeek(null)} disabled={saving} className="flex-1">
              Cancel
            </GhostButton>
            <PrimaryButton onClick={save} disabled={saving || trainingDays === 0} className="flex-[2]">
              {saving ? "Saving…" : "Save week"}
            </PrimaryButton>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Days</h2>
        <ul className="flex flex-col gap-2">
          {days.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => setView({ kind: "day", dayId: d.id })}
                disabled={week !== null}
                className={`${card} flex w-full items-center gap-3 p-3 text-left active:bg-surface-2 disabled:opacity-40`}
              >
                <DayBadge code={d.code} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{d.name}</span>
                  <span className="block text-[13px] text-fg-3">
                    {formatWeekdays(weekdaysOf(program, d.id))} · {dayPrescriptions(program, d.id).length} exercises
                  </span>
                </span>
                <ChevronRightIcon className="size-5 text-fg-3" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <GhostButton onClick={() => setView({ kind: "change" })} disabled={week !== null} className="mt-auto">
        Change program
      </GhostButton>
    </>,
  );
}
