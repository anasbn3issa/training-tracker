"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "@/components/data-provider";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { DayBadge, GhostButton, IconButton, Loading, PrimaryButton, RunBadge, card } from "@/components/ui";
import { blockWeek, effortCue, setsForWeek } from "@/lib/progression";
import { findInProgress, isoWeekday, localIsoDate, runKmLast7Days } from "@/lib/today";
import type { ProgramDay } from "@/lib/types";
import { uuid } from "@/lib/uuid";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

export default function TodayPage() {
  const { program, log, ready, pending, apply } = useData();
  const router = useRouter();
  const [weekOverride, setWeekOverride] = useState<number | null>(null);
  const [pickOtherDay, setPickOtherDay] = useState(false);

  if (!ready || !program) return <Loading />;

  const today = localIsoDate(new Date());
  const scheduled = program.days.find((d) => d.weekday === isoWeekday(today)) ?? null;
  const inProgress = findInProgress(log.sessions, today);
  const week = inProgress?.block_week ?? weekOverride ?? blockWeek(program.blockStartDate, today);
  const shownDay = program.days.find((d) => d.code === inProgress?.day_code) ?? scheduled;

  const exercises = program.prescriptions
    .filter((p) => p.day_code === shownDay?.code)
    .map((p) => ({ ...p, name: program.exercises.find((e) => e.id === p.exercise_id)?.name ?? p.exercise_id }));

  function start(day: ProgramDay) {
    apply([
      {
        kind: "upsert",
        table: "sessions",
        row: { id: uuid(), day_code: day.code, date: today, block_week: week, notes: null, completed_at: null },
      },
    ]);
    // Next keeps this page mounted; reset the picker for when we come back.
    setPickOtherDay(false);
    setWeekOverride(null);
    router.push("/session");
  }

  const changeWeek = (delta: number) => setWeekOverride(Math.min(6, Math.max(1, week + delta)));
  const setsLogged = inProgress ? log.setLogs.filter((s) => s.session_id === inProgress.id).length : 0;
  const showPicker = !inProgress && (!scheduled || pickOtherDay);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-4">
      <header>
        <p className="text-[15px] text-fg-2">{formatDay(today)}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <h1 className="text-[40px] leading-tight font-extrabold tracking-tight">
            Week <span className="tabular-nums">{week}</span>
            <span className="ml-1.5 text-lg font-semibold tracking-normal text-fg-3">of 6</span>
          </h1>
          {!inProgress && (
            <div className="flex gap-2">
              <IconButton aria-label="Previous week" onClick={() => changeWeek(-1)} disabled={week === 1}>
                <MinusIcon />
              </IconButton>
              <IconButton aria-label="Next week" onClick={() => changeWeek(1)} disabled={week === 6}>
                <PlusIcon />
              </IconButton>
            </div>
          )}
        </div>
        <div className="mt-3.5 flex gap-1.5" aria-hidden>
          {[1, 2, 3, 4, 5, 6].map((w) => (
            <i key={w} className={`h-1.5 flex-1 rounded-full ${w < week ? "bg-accent-dim" : w === week ? "bg-accent" : "bg-surface-2"}`} />
          ))}
        </div>
        <p className="mt-2.5 flex items-center gap-2 text-[15px] font-semibold text-accent">
          <span className="size-2 rounded-full bg-accent" />
          {effortCue(week)}
        </p>
      </header>

      {shownDay ? (
        <section className={`${card} p-4`}>
          <div className="mb-2 flex items-center gap-3">
            <DayBadge code={shownDay.code} />
            <div>
              <h2 className="text-xl font-bold">{shownDay.name}</h2>
              <p className="text-[13px] text-fg-3">
                {WEEKDAYS[shownDay.weekday - 1]} · {exercises.length} exercises
              </p>
            </div>
          </div>
          <ul>
            {exercises.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 border-t border-line py-2">
                <span>{e.name}</span>
                <span className="shrink-0 font-medium text-fg-2 tabular-nums">
                  {setsForWeek(e.base_sets, week)} × {e.rep_low}–{e.rep_high}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className={`${card} p-4`}>
          <h2 className="text-xl font-bold">Rest day</h2>
          <p className="mt-1 text-fg-2">Nothing scheduled. Pick a day below to train anyway.</p>
        </section>
      )}

      <section className={`${card} flex items-center gap-3.5 px-4 py-3.5`}>
        <RunBadge />
        <div>
          <p className="text-[26px] leading-tight font-extrabold tabular-nums">
            {runKmLast7Days(log.runs, today)}
            <span className="ml-1 text-[15px] font-semibold text-fg-2">km</span>
          </p>
          <p className="text-[13px] text-fg-2">Running · last 7 days</p>
        </div>
      </section>

      {pending > 0 && (
        <p className="text-sm text-fg-3">
          Saved on this phone · {pending} change{pending > 1 ? "s" : ""} waiting to sync
        </p>
      )}

      {/* Sticks above the tab bar so the main action stays in thumb reach on long days. */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 mt-auto flex flex-col gap-2 bg-linear-to-t from-bg from-75% to-transparent px-4 pt-6">
        {inProgress ? (
          <PrimaryButton onClick={() => router.push("/session")} className="min-h-[72px] flex-col gap-0">
            Resume workout
            <span className="text-sm font-semibold opacity-70">{setsLogged} sets logged</span>
          </PrimaryButton>
        ) : showPicker ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {program.days.map((d) => (
                <button
                  key={d.code}
                  onClick={() => start(d)}
                  className={`${card} flex min-h-[72px] items-center gap-3 p-3 text-left active:bg-surface-2`}
                >
                  <DayBadge code={d.code} />
                  <span className="text-[15px] leading-snug font-semibold">{d.name}</span>
                </button>
              ))}
            </div>
            {scheduled && <GhostButton onClick={() => setPickOtherDay(false)}>Back</GhostButton>}
          </>
        ) : (
          scheduled && (
            <>
              <GhostButton onClick={() => setPickOtherDay(true)}>Start another day</GhostButton>
              <PrimaryButton onClick={() => start(scheduled)}>Start workout</PrimaryButton>
            </>
          )
        )}
      </div>
    </main>
  );
}
