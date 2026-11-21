"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useData } from "@/components/data-provider";
import { ChevronRightIcon } from "@/components/icons";
import { ChooseProgram } from "@/components/program/choose-program";
import { DayEditor } from "@/components/program/day-editor";
import { WeekEditor } from "@/components/program/week-editor";
import { WeekStrip } from "@/components/program/week-strip";
import { BackButton, BackLink, DayCode, GhostButton, Loading, OfflineNotice, OutlineButton, PrimaryButton, ScreenTitle, SectionHead, eyebrow } from "@/components/ui";
import { activeDays, dayPrescriptions, formatWeekdays, planFromWeek, weekFromSchedule, weekdaysOf } from "@/lib/program";
import { RELOAD_FAILED, failureMessage, saveWeek } from "@/lib/program-api";
import { findInProgress, localIsoDate } from "@/lib/today";
import type { Week } from "@/lib/types";
import { useOnline } from "@/lib/use-online";

type View = { kind: "overview" } | { kind: "week" } | { kind: "day"; dayId: string } | { kind: "change" };

/** The user's program: their week, each day's exercises, and switching to another program. */
export default function ProgramPage() {
  const { program, log, ready, refresh } = useData();
  const router = useRouter();
  const online = useOnline();
  const [view, setView] = useState<View>({ kind: "overview" });
  // null until the week is edited; then the edited week, not yet saved.
  const [week, setWeek] = useState<Week | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready || !program?.active) return <Loading />;

  const days = activeDays(program);
  const savedWeek = weekFromSchedule(program.schedule, days);
  const shell = (children: ReactNode) => (
    <main className="flex flex-1 flex-col gap-5 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</main>
  );

  // Changing exercises mid-workout would reshuffle the session screen.
  if (findInProgress(log.sessions, localIsoDate(new Date()))) {
    return shell(
      <>
        <BackLink href="/">Today</BackLink>
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

  const closeWeek = () => {
    setWeek(null);
    setError(null);
    setView({ kind: "overview" });
  };
  const saveEditedWeek = async () => {
    if (!week) return;
    setSaving(true);
    setError(null);
    try {
      await saveWeek(planFromWeek(week));
      if (!(await refresh())) throw new Error(RELOAD_FAILED);
      closeWeek();
    } catch (e) {
      setError(failureMessage(e));
    }
    setSaving(false);
  };

  if (view.kind === "week") {
    const shown = week ?? savedWeek;
    return shell(
      <>
        <BackButton onClick={closeWeek} disabled={saving}>
          Your program
        </BackButton>
        <div>
          <p className={eyebrow}>{program.active.name}</p>
          <ScreenTitle>Your week</ScreenTitle>
        </div>
        {!online && <OfflineNotice />}
        <WeekEditor days={days} week={shown} onChange={setWeek} />
        {error && (
          <p role="alert" className="text-[15px] text-danger">
            {error}
          </p>
        )}
        <div className="mt-auto flex flex-col gap-2">
          <PrimaryButton onClick={saveEditedWeek} disabled={!week || saving || planFromWeek(shown).length === 0 || !online}>
            {saving ? "Saving…" : "Save week"}
          </PrimaryButton>
          {week && (
            <GhostButton onClick={closeWeek} disabled={saving}>
              Discard changes
            </GhostButton>
          )}
        </div>
      </>,
    );
  }

  return shell(
    <>
      <BackLink href="/">Today</BackLink>
      <div>
        <p className={eyebrow}>Your program</p>
        <ScreenTitle>{program.active.name}</ScreenTitle>
      </div>
      {!online && <OfflineNotice />}

      <section className="flex flex-col gap-2">
        <SectionHead
          title="Week"
          meta={
            <button onClick={() => setView({ kind: "week" })} className="type-label -mr-2 h-12 px-2 text-sm text-accent">
              Edit week
            </button>
          }
        />
        <WeekStrip week={savedWeek} days={days} />
      </section>

      <section>
        <SectionHead title="Sessions" />
        <ul>
          {days.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => setView({ kind: "day", dayId: d.id })}
                className="flex min-h-[62px] w-full items-center gap-3 border-b border-line py-2 text-left active:bg-surface"
              >
                <DayCode code={d.code} />
                <span className="min-w-0 flex-1">
                  <span className="type-name block text-[18px]">{d.name}</span>
                  <span className="block text-[13px] text-fg-2">
                    {formatWeekdays(weekdaysOf(program, d.id))} · {dayPrescriptions(program, d.id).length} lifts
                  </span>
                </span>
                <ChevronRightIcon className="size-5 text-fg-2" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto flex flex-col gap-2">
        <p className="text-[13px] text-fg-2">Switching keeps your history and weights. The 6-week block restarts at week 1.</p>
        <OutlineButton onClick={() => setView({ kind: "change" })}>Change program</OutlineButton>
      </div>
    </>,
  );
}
