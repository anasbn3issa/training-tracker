"use client";

import { useState } from "react";
import { addExercise, dayPrescriptions, editableDay, removeExercise, swapExercise } from "@/lib/program";
import { failureMessage, saveDayExercises } from "@/lib/program-api";
import type { Program, ProgramDay } from "@/lib/types";
import { useData } from "../data-provider";
import { XIcon } from "../icons";
import { DayBadge, GhostButton, PrimaryButton, card } from "../ui";
import { ExercisePicker } from "./exercise-picker";

/** Swap, add or remove a day's exercises. Sets and reps come from the slot (or 3 × 8–12 for an added one). */
export function DayEditor({ program, day, onClose }: { program: Program; day: ProgramDay; onClose: () => void }) {
  const { refresh } = useData();
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
      await refresh();
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
      <div className="flex items-center gap-3">
        <DayBadge code={day.code} />
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">{day.name}</h1>
      </div>
      <ul className={`${card} divide-y divide-line`}>
        {rows.map((r, i) => (
          <li key={r.exercise_id} className="flex items-center gap-2 py-1.5 pr-1.5 pl-4">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{name(r.exercise_id)}</span>
              <span className="block text-[13px] text-fg-3 tabular-nums">
                {r.base_sets} × {r.rep_low}–{r.rep_high}
                {r.note && ` · ${r.note}`}
              </span>
            </span>
            <GhostButton onClick={() => setPicking(i)} className="text-accent">
              Swap
            </GhostButton>
            <button
              aria-label={`Remove ${name(r.exercise_id)}`}
              onClick={() => edit(removeExercise(rows, i))}
              disabled={rows.length === 1}
              className="grid size-11 place-items-center rounded-xl text-fg-3 active:bg-surface-2 disabled:opacity-30"
            >
              <XIcon className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      <GhostButton onClick={() => setPicking("add")} className="self-start text-accent">
        + Add exercise
      </GhostButton>
      <p className="text-[13px] text-fg-3">Past sessions keep what you did. Weights carry over to a swapped-in exercise you have logged before.</p>
      {error && <p className="text-[15px] text-danger">{error}</p>}
      <div className="mt-auto flex flex-col gap-2">
        <PrimaryButton onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save day"}
        </PrimaryButton>
        <GhostButton onClick={onClose} disabled={saving}>
          {dirty ? "Discard changes" : "Back"}
        </GhostButton>
      </div>
    </>
  );
}
