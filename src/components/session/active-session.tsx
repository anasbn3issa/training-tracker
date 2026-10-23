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
import { RestTimer } from "./rest-timer";
import { Stepper, WeightField } from "./stepper";

type Draft = { weightKg: number | null; reps: number };

const SWIPE_PX = 60;

const isBodyweight = (t: Exercise["load_type"]) => t === "bodyweight" || t === "bodyweight_plus";

export function ActiveSession({
  session,
  program,
  log,
  apply,
}: {
  session: Session;
  program: Program;
  log: LogState;
  apply: (ops: Op[]) => void;
}) {
  useWakeLock();
  const router = useRouter();

  const items = program.prescriptions
    .filter((rx) => rx.day_code === session.day_code)
    .flatMap((rx) => {
      const exercise = program.exercises.find((e) => e.id === rx.exercise_id);
      if (!exercise) return [];
      const last = findLastSets(log.sessions, log.setLogs, session.day_code, rx.exercise_id);
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
  if (!item) return <p className="p-4">No exercises for day {session.day_code}.</p>;

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
      : `${suggestedLoad}${suggestedLoad === "BW" ? "" : " kg"}${suggestion.advanced ? `  ↑ +${exercise.increment_kg}` : ""}`;

  return (
    <main
      className="flex flex-1 flex-col gap-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      onTouchStart={(e) => (touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || (e.target instanceof HTMLElement && e.target.closest("button, input"))) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <header className="flex items-center justify-between">
        <Link href="/" className="flex h-12 items-center pr-3 text-zinc-400">
          ‹ Today
        </Link>
        <div className="flex items-center">
          <NavButton label="Previous exercise" glyph="‹" disabled={index === 0} onClick={() => go(index - 1)} />
          <span className="flex w-20 flex-col items-center leading-tight">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Exercise</span>
            <span className="text-xl font-bold tabular-nums">
              {index + 1} / {items.length}
            </span>
          </span>
          <NavButton label="Next exercise" glyph="›" disabled={isLast} onClick={() => go(index + 1)} />
        </div>
        <button onClick={finish} className="h-12 pl-3 text-zinc-400">
          Finish
        </button>
      </header>

      <section>
        <h1 className="text-3xl font-bold leading-tight">{exercise.name}</h1>
        {rx.note && <p className="text-amber-300">{rx.note}</p>}
        <dl className="mt-2 grid grid-cols-[7rem_1fr] gap-y-1 text-lg">
          <dt className="text-zinc-500">Target</dt>
          <dd className="tabular-nums">
            {suggestion.sets} × {rx.rep_low}–{rx.rep_high} <span className="text-lime-300">· {suggestion.effortCue}</span>
          </dd>
          <dt className="text-zinc-500">Last</dt>
          <dd className="tabular-nums">{lastLine}</dd>
          <dt className="text-zinc-500">Suggested</dt>
          <dd className="font-semibold tabular-nums">{suggestedLine}</dd>
        </dl>
      </section>

      <section aria-label="Sets" className="flex flex-wrap gap-2">
        {Array.from({ length: Math.max(suggestion.sets, logged.length) }, (_, i) => {
          const done = logged[i];
          const current = i === logged.length;
          return (
            <span
              key={i}
              className={`rounded-lg px-3 py-2 text-lg tabular-nums ${
                done ? "bg-zinc-700" : current ? "outline-2 outline-lime-400" : "text-zinc-600 outline-1 outline-zinc-800"
              }`}
            >
              {done ? `${formatLoad(done.weight_kg, exercise.load_type)}×${done.reps}` : `Set ${i + 1}`}
            </span>
          );
        })}
      </section>

      <div className="flex items-stretch gap-3">
        <div className="flex-1">
          <RestTimer endsAt={restEndsAt} />
        </div>
        {undoable && (
          <button onClick={undo} className="min-h-12 rounded-xl bg-zinc-900 px-4 text-zinc-300 active:bg-zinc-700">
            Undo last set
            <span className="block text-sm tabular-nums text-zinc-500">
              {formatLoad(undoable.weight_kg, program.exercises.find((e) => e.id === undoable.exercise_id)?.load_type ?? "machine")}×
              {undoable.reps}
            </span>
          </button>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {exercise.load_type !== "bodyweight" && (
          <Stepper
            label={isBodyweight(exercise.load_type) ? "Added kg" : "kg"}
            onStep={(dir) => setDraft({ ...draft, weightKg: stepWeight(draft.weightKg, dir * WEIGHT_STEP_KG) })}
            fineStep={(dir) => setDraft({ ...draft, weightKg: stepWeight(draft.weightKg, dir * WEIGHT_FINE_STEP_KG) })}
          >
            <WeightField
              value={draft.weightKg}
              onChange={(kg) => setDraft({ ...draft, weightKg: kg })}
              placeholder={exercise.load_type === "bodyweight_plus" ? "0 = BW" : "First weight"}
            />
          </Stepper>
        )}
        <Stepper label="reps" onStep={(dir) => setDraft({ ...draft, reps: stepReps(draft.reps, dir) })}>
          <span className="text-5xl font-bold tabular-nums">{draft.reps}</span>
        </Stepper>

        <button
          onClick={onPrimary}
          className="min-h-20 touch-manipulation rounded-2xl bg-lime-400 text-3xl font-bold text-black active:bg-lime-300"
        >
          {primaryLabel}
        </button>
        {prescribedDone && (
          <button onClick={logSet} className="h-12 text-zinc-400 underline">
            Add set {logged.length + 1}
          </button>
        )}
      </div>
    </main>
  );
}

function NavButton({ label, glyph, disabled, onClick }: { label: string; glyph: string; disabled: boolean; onClick: () => void }) {
  return (
    <button aria-label={label} disabled={disabled} onClick={onClick} className="h-12 w-12 text-3xl disabled:opacity-20">
      {glyph}
    </button>
  );
}
