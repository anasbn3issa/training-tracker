"use client";

import { useState } from "react";
import { addExercise, dayPrescriptions, editableDay, removeExercise, swapExercise } from "@/lib/program";
import { RELOAD_FAILED, failureMessage, saveDayExercises } from "@/lib/program-api";
import type { Program, ProgramDay } from "@/lib/types";
import { useOnline } from "@/lib/use-online";
import { useData } from "../data-provider";
import { XIcon } from "../icons";
import { BackButton, DayCode, GhostButton, OfflineNotice, OutlineButton, PrimaryButton, ScreenTitle } from "../ui";
import { ExercisePicker } from "./exercise-picker";

/** Swap, add or remove a day's exercises. Sets and reps come from the slot (or 3 × 8–12 for an added one). */
export function DayEditor({ program, day, onClose }: { program: Program; day: ProgramDay; onClose: () => void }) {
  const { refresh } = useData();
  const online = useOnline();
  const [rows, setRows] = useState(() => editableDay(dayPrescriptions(program, day.id)));
  // null: the list; "add": picking an exercise to add; a number: picking the replacement for that row.
  const [picking, setPicking] = useState<"add" | number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const name = (id: string) => program.exercises.find((e) => e.id === id)?.name ?? id;
  const edit = (next: typeof rows) => {
    setRows(next);
    setDirty(true);
    setPicking(null);
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveDayExercises(day.id, rows);
      if (!(await refresh())) throw new Error(RELOAD_FAILED);
      onClose();
    } catch (e) {
      setError(failureMessage(e));
      setSaving(false);
    }
  }

  if (picking !== null) {
    return (
      <ExercisePicker
        exercises={program.exercises}
        exclude={rows.map((r) => r.exercise_id)}
        title={picking === "add" ? "Add an exercise" : `Replace ${name(rows[picking].exercise_id)}`}
        onPick={(id) => edit(picking === "add" ? addExercise(rows, id) : swapExercise(rows, picking, id))}
        onCancel={() => setPicking(null)}
      />
    );
  }

  return (
    <>
      <BackButton onClick={onClose} disabled={saving}>
        Your program
      </BackButton>
      <div className="flex items-center gap-3">
        <DayCode code={day.code} size="lg" />
        <ScreenTitle>{day.name}</ScreenTitle>
      </div>
      {!online && <OfflineNotice />}
      <ul className="border-t-[3px] border-fg">
        {rows.map((r, i) => (
          <li key={r.exercise_id} className="flex min-h-[62px] items-center gap-2 border-b border-line py-1.5">
            <span className="min-w-0 flex-1">
              <span className="type-name block text-[17px]">{name(r.exercise_id)}</span>
              <span className="block text-[13px] text-fg-2 tabular-nums">
                {r.base_sets} × {r.rep_low}–{r.rep_high}
                {r.note && ` · ${r.note}`}
              </span>
            </span>
            <OutlineButton onClick={() => setPicking(i)} aria-label={`Swap ${name(r.exercise_id)}`} className="px-3 text-sm">
              Swap
            </OutlineButton>
            <button
              aria-label={`Remove ${name(r.exercise_id)}`}
              onClick={() => edit(removeExercise(rows, i))}
              disabled={rows.length === 1}
              className="grid size-12 shrink-0 place-items-center text-fg-2 active:bg-surface disabled:opacity-30"
            >
              <XIcon className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => setPicking("add")}
        className="type-label flex h-14 items-center justify-center border-2 border-dashed border-fg-3 text-base text-fg active:bg-surface"
      >
        + Add exercise
      </button>
      <p className="text-[13px] text-fg-2">Past sessions keep what you did. A swapped-in lift you&apos;ve logged before keeps its weight.</p>
      {error && (
        <p role="alert" className="text-[15px] text-danger">
          {error}
        </p>
      )}
      <div className="mt-auto flex flex-col gap-2">
        <PrimaryButton onClick={save} disabled={!dirty || saving || !online}>
          {saving ? "Saving…" : `Save ${day.name}`}
        </PrimaryButton>
        {dirty && (
          <GhostButton onClick={onClose} disabled={saving}>
            Discard changes
          </GhostButton>
        )}
      </div>
    </>
  );
}
