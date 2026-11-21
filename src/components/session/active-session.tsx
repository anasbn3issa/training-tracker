"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { dayPrescriptions } from "@/lib/program";
import { blockPhase, findLastSets, suggest } from "@/lib/progression";
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
import { PHASE_LABEL } from "../block/phase-label";
import { ChevronLeftIcon, ChevronRightIcon, UndoIcon } from "../icons";
import { BackLink, GhostButton, PhaseTag, PrimaryButton, WeightUpTag, eyebrow } from "../ui";
import { RestTimer } from "./rest-timer";
import { Stepper, WeightField, stepperValue } from "./stepper";

type Draft = { weightKg: number | null; reps: number };

const SWIPE_PX = 60;

const isBodyweight = (t: Exercise["load_type"]) => t === "bodyweight" || t === "bodyweight_plus";

export function ActiveSession({
  session,
  dayId,
  program,
  log,
  apply,
}: {
  session: Session;
  /** The program day; custom workouts use CustomSession. */
  dayId: string;
  program: Program;
  log: LogState;
  apply: (ops: Op[]) => void;
}) {
  useWakeLock();
  const router = useRouter();

  const items = dayPrescriptions(program, dayId).flatMap((rx) => {
    const exercise = program.exercises.find((e) => e.id === rx.exercise_id);
    if (!exercise) return [];
    const last = findLastSets(log.sessions, log.setLogs, dayId, rx.exercise_id);
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
  if (!item) return <p className="p-4 text-fg-2">No exercises for this day.</p>;

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
  const firstTime = suggestion.weightKg === null && exercise.load_type !== "bodyweight";
  const suggestedLoad = formatLoad(suggestion.weightKg, exercise.load_type);
  const undoLoad = program.exercises.find((e) => e.id === undoable?.exercise_id)?.load_type ?? "machine";

  const undoButton = undoable && (
    <button onClick={undo} className="-mr-1 flex h-12 items-center gap-1.5 px-1 text-sm font-semibold text-current">
      <UndoIcon className="size-5" />
      Undo
      <span className="tabular-nums">
        {formatLoad(undoable.weight_kg, undoLoad)}×{undoable.reps}
      </span>
    </button>
  );

  return (
    <main
      className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]"
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
      <header className="flex items-center justify-between gap-1">
        <BackLink href="/">Today</BackLink>
        <div className="flex items-center">
          <NavButton label="Previous exercise" disabled={index === 0} onClick={() => go(index - 1)}>
            <ChevronLeftIcon className="size-5" />
          </NavButton>
          <div className="flex gap-[3px]" aria-hidden>
            {items.map((it, i) => (
              <i
                key={it.exercise.id}
                className={`h-1.5 ${i === index ? "w-6 bg-accent" : it.logged.length >= it.suggestion.sets ? "w-3 bg-fg" : "w-3 bg-line"}`}
              />
            ))}
          </div>
          <NavButton label="Next exercise" disabled={isLast} onClick={() => go(index + 1)}>
            <ChevronRightIcon className="size-5" />
          </NavButton>
        </div>
        <button onClick={undoable ? finish : cancel} className="type-label -mr-2 h-12 px-2 text-sm text-fg">
          {undoable ? "Finish" : "Cancel"}
        </button>
      </header>

      <div>
        <p className={eyebrow}>
          Exercise {index + 1} of {items.length}
        </p>
        <h1 className="type-display mt-1 text-[52px]">{exercise.name}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-base font-bold">
          <PhaseTag>
            Wk {session.block_week} · {PHASE_LABEL[blockPhase(session.block_week)]}
          </PhaseTag>
          {suggestion.effortCue}
        </p>
        {rx.note && <p className="type-label mt-2 inline-block border border-line px-2 py-1 text-xs text-fg-2">{rx.note}</p>}
      </div>

      <div>
        <dl className="border-t-[3px] border-fg">
          <InfoRow label="Target">
            {suggestion.sets} × {rx.rep_low}–{rx.rep_high}
          </InfoRow>
          <InfoRow label="Last time">{lastLine}</InfoRow>
          <InfoRow label="Today">
            {firstTime ? (
              <span className="font-sans text-[15px] font-medium text-fg-2">First time: enter a working weight</span>
            ) : (
              <span className="flex items-center justify-end gap-2">
                {suggestion.advanced && <WeightUpTag kg={exercise.increment_kg} />}
                <span className="text-xl">
                  {suggestedLoad}
                  {suggestedLoad === "BW" ? "" : " kg"}
                </span>
              </span>
            )}
          </InfoRow>
        </dl>
        {suggestion.advanced && <p className="mt-1.5 text-[13px] text-fg-2">Every set hit {rx.rep_high} last time, so the weight goes up.</p>}
      </div>

      <section aria-label="Sets" className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: Math.max(suggestion.sets, logged.length) }, (_, i) => {
          const done = logged[i];
          const current = i === logged.length;
          return (
            <span
              key={i}
              className={`type-name flex h-[52px] items-center justify-center text-[15px] tabular-nums ${
                done ? "bg-fg text-bg" : current ? "border-[3px] border-accent text-accent" : "border border-fg-3 text-fg-3"
              }`}
            >
              {done ? `${formatLoad(done.weight_kg, exercise.load_type)}×${done.reps}` : `Set ${i + 1}`}
            </span>
          );
        })}
      </section>

      {restEndsAt !== null ? (
        <RestTimer endsAt={restEndsAt} totalSeconds={REST_SECONDS}>
          {undoButton}
        </RestTimer>
      ) : (
        undoButton && <div className="flex justify-end text-fg-2">{undoButton}</div>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <section aria-label="Next set" className="flex flex-col gap-2.5">
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

        <PrimaryButton tall onClick={onPrimary}>
          {primaryLabel}
        </PrimaryButton>
        {prescribedDone && <GhostButton onClick={logSet}>Add set {logged.length + 1}</GhostButton>}
      </div>
    </main>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-line py-2">
      <dt className="shrink-0 text-[15px] text-fg-2">{label}</dt>
      <dd className="type-name text-right text-[17px] tabular-nums">{children}</dd>
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
