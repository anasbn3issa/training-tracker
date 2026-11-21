"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BlockHeader } from "@/components/block/block-header";
import { useData } from "@/components/data-provider";
import { ChevronRightIcon } from "@/components/icons";
import { TodayExercises } from "@/components/today-exercises";
import { DayCode, GhostButton, Loading, OutlineButton, PrimaryButton, RunBadge, SectionHead, SessionBadge } from "@/components/ui";
import { activeDays, scheduledDay } from "@/lib/program";
import { blockWeek, shiftBlockStart } from "@/lib/progression";
import { findInProgress, isoWeekday, localIsoDate, runKmLast7Days } from "@/lib/today";
import type { ProgramDay } from "@/lib/types";
import { currentUserName } from "@/lib/user-cookie";
import { uuid } from "@/lib/uuid";

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const rowButton = "flex min-h-14 w-full items-center gap-3 border-b border-line py-2 text-left active:bg-surface";

export default function TodayPage() {
  const { program, log, ready, pending, apply } = useData();
  const router = useRouter();
  const [pickOtherDay, setPickOtherDay] = useState(false);
  const [customTitle, setCustomTitle] = useState<string | null>(null); // non-null while naming a custom workout

  if (!ready || !program) return <Loading />;

  const today = localIsoDate(new Date());
  const scheduled = scheduledDay(program, isoWeekday(today));
  const inProgress = findInProgress(log.sessions, today);
  const week = inProgress?.block_week ?? blockWeek(log.blockStartDate, today);
  const shownDay = program.days.find((d) => d.id === inProgress?.day_id) ?? scheduled;

  function startSession(target: { day_id: string; title: null } | { day_id: null; title: string }) {
    apply([
      {
        kind: "upsert",
        table: "sessions",
        row: { id: uuid(), ...target, date: today, block_week: week, notes: null, completed_at: null },
      },
    ]);
    // Next keeps this page mounted; reset the picker for when we come back.
    setPickOtherDay(false);
    setCustomTitle(null);
    router.push("/session");
  }
  const start = (day: ProgramDay) => startSession({ day_id: day.id, title: null });
  const startCustom = (title: string) => startSession({ day_id: null, title: title.trim() });

  // Saved: shifts this user's block start so the app remembers the week from now on.
  const changeWeek = (delta: number) =>
    apply([{ kind: "set_block_start", date: shiftBlockStart(log.blockStartDate, today, Math.min(6, Math.max(1, week + delta))) }]);
  const setsLogged = inProgress ? log.setLogs.filter((s) => s.session_id === inProgress.id).length : 0;
  const showPicker = !inProgress && (!scheduled || pickOtherDay);

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 pt-3 pb-4">
      <header className="flex flex-col">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-medium text-fg-2">
            {formatDay(today)} · {currentUserName()}
          </p>
          <Link href="/program" className="type-label -mr-2 flex h-12 items-center px-2 text-[13px] text-fg">
            Program
          </Link>
        </div>
        <BlockHeader week={week} onChangeWeek={inProgress ? undefined : changeWeek} />
      </header>

      {inProgress?.day_id === null ? (
        <section>
          <SectionHead title={inProgress.title} meta="Custom · in progress" />
        </section>
      ) : shownDay ? (
        <TodayExercises program={program} log={log} day={shownDay} week={week} />
      ) : (
        <section>
          <SectionHead title="Rest day" />
          <p className="mt-2 text-fg-2">Nothing scheduled. Pick a day below to train anyway.</p>
        </section>
      )}

      <section aria-label="Running" className="flex items-center gap-3 border-y border-line py-3">
        <RunBadge />
        <p className="flex items-baseline gap-1.5">
          <span className="type-number text-[30px] text-run">{runKmLast7Days(log.runs, today)}</span>
          <span className="text-[15px] text-fg-2">km run · last 7 days</span>
        </p>
      </section>

      {pending > 0 && (
        <p className="text-sm text-fg-2">
          Saved on this phone · {pending} change{pending > 1 ? "s" : ""} waiting to sync
        </p>
      )}

      {/* Sticks above the tab bar (56px + 3px rule) so the main action stays in thumb reach on long days. */}
      <div className="sticky bottom-[calc(59px+env(safe-area-inset-bottom))] -mx-4 mt-auto flex flex-col gap-2 bg-bg px-4 pt-3 pb-3">
        {inProgress ? (
          <PrimaryButton tall stacked onClick={() => router.push("/session")}>
            Resume workout
            <span className="type-label text-[13px]">{inProgress.day_id === null ? inProgress.title : `${setsLogged} sets logged`}</span>
          </PrimaryButton>
        ) : customTitle !== null ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customTitle.trim()) startCustom(customTitle);
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="custom-title" className="type-label text-xs text-fg-2">
              Custom workout title
            </label>
            <input
              id="custom-title"
              autoFocus
              maxLength={80}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Arms, Hyrox class"
              className="h-14 border-2 border-line bg-bg px-4 text-lg outline-none placeholder:text-fg-3 focus:border-accent"
            />
            <PrimaryButton type="submit" disabled={!customTitle.trim()}>
              Start custom workout
            </PrimaryButton>
            <GhostButton type="button" onClick={() => setCustomTitle(null)}>
              Back
            </GhostButton>
          </form>
        ) : showPicker ? (
          <>
            <p className="type-label text-xs text-fg-2">Pick a session</p>
            <ul>
              {activeDays(program).map((d) => (
                <li key={d.id}>
                  <button onClick={() => start(d)} className={rowButton}>
                    <DayCode code={d.code} />
                    <span className="type-name flex-1 text-[17px]">{d.name}</span>
                    <ChevronRightIcon className="size-5 text-fg-2" />
                  </button>
                </li>
              ))}
              <li>
                <button onClick={() => setCustomTitle("")} className={rowButton}>
                  <SessionBadge dayCode={null} />
                  <span className="type-name flex-1 text-[17px]">Custom workout</span>
                  <ChevronRightIcon className="size-5 text-fg-2" />
                </button>
              </li>
            </ul>
            {scheduled && <GhostButton onClick={() => setPickOtherDay(false)}>Back</GhostButton>}
          </>
        ) : (
          scheduled && (
            <>
              <OutlineButton onClick={() => setPickOtherDay(true)}>Another day</OutlineButton>
              <PrimaryButton onClick={() => start(scheduled)}>Start {scheduled.name}</PrimaryButton>
            </>
          )
        )}
      </div>
    </main>
  );
}
