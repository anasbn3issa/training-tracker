"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { findLastSets, suggest } from "@/lib/progression";
import {
  REST_SECONDS,
  WEIGHT_FINE_STEP_KG,
  WEIGHT_STEP_KG,
  firstUnfinishedIndex,
  formatLoad,
  formatSets,
  lastLoggedSet,
  nextSetDefaults,
  setsLoggedFor,
  stepReps,
  stepWeight,
} from "@/lib/session";
import type { Exercise, LogState, Op, Program, Session } from "@/lib/types";
import { useWakeLock } from "@/lib/use-wake-lock";
import { uuid } from "@/lib/uuid";
import { ChevronLeftIcon, ChevronRightIcon, UndoIcon } from "../icons";
import { GhostButton, PrimaryButton, card } from "../ui";
import { RestTimer } from "./rest-timer";
import { Stepper, WeightField, stepperValue } from "./stepper";

type Draft = { weightKg: number | null; reps: number };

const SWIPE_PX = 60;

const isBodyweight = (t: Exercise["load_type"]) => t === "bodyweight" || t === "bodyweight_plus";

export function ActiveSession({
  session,
  dayCode,
  program,
  log,
  apply,
}: {
  session: Session;
  /** The program day (A–D); custom workouts use CustomSession. */
  dayCode: string;
  program: Program;
  log: LogState;
  apply: (ops: Op[]) => void;
}) {
  useWakeLock();
  const router = useRouter();

  const items = program.prescriptions
    .filter((rx) => rx.day_code === dayCode)
    .flatMap((rx) => {
      const exercise = program.exercises.find((e) => e.id === rx.exercise_id);
      if (!exercise) return [];
      const last = findLastSets(log.sessions, log.setLogs, dayCode, rx.exercise_id);
      return [
        {
          rx,
          exercise,
          suggestion: suggest({ ...rx, increment_kg: exercise.increment_kg }, session.block_week, last),
          logged: setsLoggedFor(log.setLogs, session.id, rx.exercise_id),
        },
      ];
    });

  const [index, setIndex] = useState(() =>
    firstUnfinishedIndex(items.map((i) => ({ sets: i.suggestion.sets, logged: i.logged.length }))),
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const item = items[index];
  if (!item) return <p className="p-4 text-fg-2">No exercises for day {dayCode}.</p>;

  const { rx, exercise, suggestion, logged } = item;
  const draft = drafts[exercise.id] ?? nextSetDefaults(suggestion, logged);
  const setDraft = (next: Draft) => setDrafts((d) => ({ ...d, [exercise.id]: next }));
  const prescribedDone = logged.length >= suggestion.sets;
  const isLast = index === items.length - 1;
  const undoable = lastLoggedSet(log.setLogs, session.id);
  const go = (to: number) => setIndex(Math.min(items.length - 1, Math.max(0, to)));

  function logSet() {
    const weight = draft.weightKg ?? (exercise.load_type === "bodyweight_plus" ? 0 : null);
    apply([
      {
        kind: "upsert",
        table: "set_logs",
        row: {
          id: uuid(),
          session_id: session.id,
          exercise_id: exercise.id,
          set_index: (logged.at(-1)?.set_index ?? 0) + 1,
          weight_kg: exercise.load_type === "bodyweight" ? null : weight,
          reps: draft.reps,
          done_at: new Date().toISOString(),
        },
      },
    ]);
    setDrafts((d) => {
      const next = { ...d };
      delete next[exercise.id];
      return next;
    });
    setRestEndsAt(Date.now() + REST_SECONDS * 1000);
  }

  function undo() {
    if (!undoable) return;
    apply([{ kind: "delete", table: "set_logs", id: undoable.id }]);
    // Back on that exercise with its values loaded, ready to fix and re-log.
    setIndex(Math.max(0, items.findIndex((i) => i.exercise.id === undoable.exercise_id)));
    setDrafts((d) => ({ ...d, [undoable.exercise_id]: { weightKg: undoable.weight_kg, reps: undoable.reps } }));
    setRestEndsAt(null);
  }

  // Started by mistake: nothing logged, so nothing to keep.
  function cancel() {
    apply([{ kind: "delete", table: "sessions", id: session.id }]);
    router.replace("/");
  }

  function finish() {
    apply([{ kind: "upsert", table: "sessions", row: { ...session, completed_at: new Date().toISOString() } }]);
    router.replace("/");
  }

  const primary = !prescribedDone ? "log" : isLast ? "finish" : "next";
  const primaryLabel = { log: `Done · set ${logged.length + 1}`, finish: "Finish", next: "Next exercise" }[primary];
  function onPrimary() {
    if (primary === "log") logSet();
    else if (primary === "finish") finish();
    else go(index + 1);
  }

  const lastLine = formatSets(suggestion.lastSets, exercise.load_type);
  const suggestedLoad = formatLoad(suggestion.weightKg, exercise.load_type);
  const suggestedLine =
    suggestion.weightKg === null && exercise.load_type !== "bodyweight"
      ? "First time: enter a working weight"
      : `${suggestedLoad}${suggestedLoad === "BW" ? "" : " kg"}${suggestion.advanced ? ` ↑ +${exercise.increment_kg}` : ""}`;

  const undoLoad = program.exercises.find((e) => e.id === undoable?.exercise_id)?.load_type ?? "machine";

  return (
    <main
      className="flex flex-1 flex-col gap-3.5 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      onTouchStart={(e) => (touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || (e.target instanceof HTMLElement && e.target.closest("button, input, a"))) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <header className="flex items-center justify-between">
        <Link href="/" className="-ml-1 flex h-12 items-center gap-0.5 pr-1 text-[15px] font-medium text-fg-2">
          <ChevronLeftIcon className="size-5" />
          Today
        </Link>
        <div className="flex items-center">
          <NavButton label="Previous exercise" disabled={index === 0} onClick={() => go(index - 1)}>
            <ChevronLeftIcon className="size-5" />
          </NavButton>
          <div className="flex w-[7.5rem] flex-col items-center gap-1.5">
            <p className="text-[13px] font-semibold text-fg-2 tabular-nums">
              Exercise {index + 1} of {items.length}
            </p>
            <div className="flex gap-[5px]" aria-hidden>
              {items.map((it, i) => (
                <i
                  key={it.exercise.id}
                  className={`h-[7px] rounded-full ${
                    i === index ? "w-[18px] bg-accent" : it.logged.length >= it.suggestion.sets ? "w-[7px] bg-accent-dim" : "w-[7px] bg-surface-2"
                  }`}
                />
              ))}
            </div>
          </div>
          <NavButton label="Next exercise" disabled={isLast} onClick={() => go(index + 1)}>
            <ChevronRightIcon className="size-5" />
          </NavButton>
        </div>
        <GhostButton onClick={undoable ? finish : cancel} className="px-2">
          {undoable ? "Finish" : "Cancel"}
        </GhostButton>
      </header>

      <div>
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">{exercise.name}</h1>
        {rx.note && <p className="mt-1.5 inline-block rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-medium text-fg-2">{rx.note}</p>}
      </div>

      <dl className={`${card} px-4 py-1`}>
        <InfoRow label="Target">
          <span className="tabular-nums">
            {suggestion.sets} × {rx.rep_low}–{rx.rep_high}
          </span>
          <span className="text-fg-2"> · {suggestion.effortCue}</span>
        </InfoRow>
        <InfoRow label="Last">
          <span className="tabular-nums">{lastLine}</span>
        </InfoRow>
        <InfoRow label="Suggested">
          <span className={`font-bold tabular-nums ${suggestion.advanced ? "text-accent" : suggestion.weightKg === null ? "font-medium text-fg-2" : ""}`}>
            {suggestedLine}
          </span>
        </InfoRow>
      </dl>

      <section aria-label="Sets" className="grid grid-cols-4 gap-2">
        {Array.from({ length: Math.max(suggestion.sets, logged.length) }, (_, i) => {
          const done = logged[i];
          const current = i === logged.length;
          return (
            <span
              key={i}
              className={`flex h-[52px] items-center justify-center rounded-[14px] text-[15px] tabular-nums ${
                done
                  ? "bg-surface-2 font-bold"
                  : current
                    ? "border-2 border-accent font-bold text-accent"
                    : "border border-line bg-surface text-fg-3"
              }`}
            >
              {done ? `${formatLoad(done.weight_kg, exercise.load_type)}×${done.reps}` : `Set ${i + 1}`}
            </span>
          );
        })}
      </section>

      {(restEndsAt !== null || undoable) && (
        <div className="flex items-stretch gap-2.5">
          {restEndsAt !== null ? <RestTimer endsAt={restEndsAt} totalSeconds={REST_SECONDS} /> : <div className="flex-1" />}
          {undoable && (
            <button
              onClick={undo}
              className={`${card} flex w-[104px] flex-col items-center justify-center gap-1 py-2 text-[13px] font-semibold text-fg-2 active:bg-surface-2`}
            >
              <UndoIcon className="size-5" />
              Undo
              <span className="font-medium text-fg-3 tabular-nums">
                {formatLoad(undoable.weight_kg, undoLoad)}×{undoable.reps}
              </span>
            </button>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <section className={`${card} flex flex-col gap-2.5 p-3`}>
          {exercise.load_type !== "bodyweight" && (
            <Stepper
              label={isBodyweight(exercise.load_type) ? "Added kg" : "kg"}
              onStep={(dir) => setDraft({ ...draft, weightKg: stepWeight(draft.weightKg, dir * WEIGHT_STEP_KG) })}
              fineStep={(dir) => setDraft({ ...draft, weightKg: stepWeight(draft.weightKg, dir * WEIGHT_FINE_STEP_KG) })}
            >
              <WeightField
                value={draft.weightKg}
                onChange={(kg) => setDraft({ ...draft, weightKg: kg })}
                placeholder={exercise.load_type === "bodyweight_plus" ? "0 = bodyweight" : "First weight"}
              />
            </Stepper>
          )}
          <Stepper label="reps" onStep={(dir) => setDraft({ ...draft, reps: stepReps(draft.reps, dir) })}>
            <span className={stepperValue}>{draft.reps}</span>
          </Stepper>
        </section>

        <PrimaryButton onClick={onPrimary} className="min-h-[72px] text-[22px]">
          {primaryLabel}
        </PrimaryButton>
        {prescribedDone && <GhostButton onClick={logSet}>Add set {logged.length + 1}</GhostButton>}
      </div>
    </main>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-line py-2.5 [&+&]:border-t">
      <dt className="shrink-0 text-xs font-semibold tracking-[0.06em] text-fg-3 uppercase">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} disabled={disabled} onClick={onClick} className="grid size-12 place-items-center text-fg disabled:opacity-20">
      {children}
    </button>
  );
}
