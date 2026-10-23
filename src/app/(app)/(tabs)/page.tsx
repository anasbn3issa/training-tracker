"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "@/components/data-provider";
import { blockWeek, effortCue, setsForWeek } from "@/lib/progression";
import { findInProgress, isoWeekday, localIsoDate, runKmLast7Days } from "@/lib/today";
import type { ProgramDay } from "@/lib/types";
import { uuid } from "@/lib/uuid";

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

export default function TodayPage() {
  const { program, log, ready, pending, apply } = useData();
  const router = useRouter();
  const [weekOverride, setWeekOverride] = useState<number | null>(null);
  const [pickOtherDay, setPickOtherDay] = useState(false);

  if (!ready || !program) return <p className="p-4 text-zinc-500">Loading…</p>;

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
    router.push("/session");
  }

  const changeWeek = (delta: number) => setWeekOverride(Math.min(6, Math.max(1, week + delta)));
  const setsLogged = inProgress ? log.setLogs.filter((s) => s.session_id === inProgress.id).length : 0;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4">
      <header>
        <p className="text-zinc-400">{formatDay(today)}</p>
        <div className="mt-2 flex items-center gap-3">
          {!inProgress && <StepButton label="−" onClick={() => changeWeek(-1)} disabled={week === 1} />}
          <p className="text-4xl font-bold tabular-nums">Week {week}</p>
          {!inProgress && <StepButton label="+" onClick={() => changeWeek(1)} disabled={week === 6} />}
        </div>
        <p className="mt-1 text-lg text-lime-300">{effortCue(week)}</p>
      </header>

      <section>
        {shownDay ? (
          <>
            <h2 className="text-2xl font-bold">
              {shownDay.code} · {shownDay.name}
            </h2>
            <ul className="mt-3 flex flex-col gap-1 text-lg">
              {exercises.map((e) => (
                <li key={e.id} className="flex justify-between gap-4">
                  <span>{e.name}</span>
                  <span className="shrink-0 tabular-nums text-zinc-400">
                    {setsForWeek(e.base_sets, week)} × {e.rep_low}–{e.rep_high}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <h2 className="text-2xl font-bold">Rest day</h2>
        )}
      </section>

      <section className="rounded-xl bg-zinc-900 p-4">
        <p className="text-zinc-400">Running, last 7 days</p>
        <p className="text-3xl font-bold tabular-nums">{runKmLast7Days(log.runs, today)} km</p>
      </section>

      {pending > 0 && (
        <p className="text-zinc-500">
          Saved on this phone · {pending} change{pending > 1 ? "s" : ""} waiting to sync
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {inProgress ? (
          <PrimaryButton onClick={() => router.push("/session")}>
            Resume <span className="block text-base font-medium">{setsLogged} sets logged</span>
          </PrimaryButton>
        ) : scheduled && !pickOtherDay ? (
          <>
            <button onClick={() => setPickOtherDay(true)} className="h-12 text-zinc-400 underline">
              Start another day
            </button>
            <PrimaryButton onClick={() => start(scheduled)}>Start</PrimaryButton>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {program.days.map((d) => (
              <button key={d.code} onClick={() => start(d)} className="min-h-20 rounded-xl bg-zinc-800 p-3 text-left active:bg-zinc-700">
                <span className="block text-2xl font-bold">{d.code}</span>
                <span className="text-zinc-300">{d.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="min-h-20 rounded-2xl bg-lime-400 py-3 text-3xl font-bold text-black active:bg-lime-300">
      {children}
    </button>
  );
}

function StepButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label === "+" ? "Next week" : "Previous week"}
      className="h-12 w-12 rounded-xl bg-zinc-800 text-2xl font-bold disabled:opacity-30"
    >
      {label}
    </button>
  );
}
