"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useData } from "@/components/data-provider";
import { buildRun, formatPace, type RunForm } from "@/lib/history";
import { localIsoDate } from "@/lib/today";
import type { Run } from "@/lib/types";
import { uuid } from "@/lib/uuid";

const KINDS: { value: Run["kind"]; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "long", label: "Long" },
  { value: "intervals", label: "Intervals" },
  { value: "race", label: "Race" },
];

const inputClass = "h-14 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-xl tabular-nums";

export default function LogRunPage() {
  const { ready } = useData();
  // The form mounts only on the client, so "today" is the phone's date, not the build's.
  if (!ready) return <p className="p-4 text-zinc-500">Loading…</p>;
  return <RunFormView />;
}

const emptyForm = (): RunForm => ({
  date: localIsoDate(new Date()),
  kind: "easy",
  distance: "",
  minutes: "",
  seconds: "",
  effort: null,
  notes: "",
});

function RunFormView() {
  const { apply } = useData();
  const router = useRouter();
  // Next keeps this page mounted when switching tabs, so an unsaved draft survives;
  // it is reset only after saving.
  const [form, setForm] = useState<RunForm>(emptyForm);
  const set = (patch: Partial<RunForm>) => setForm((f) => ({ ...f, ...patch }));
  const preview = buildRun(form, "preview");

  function save() {
    const run = buildRun(form, uuid());
    if (!run) return;
    apply([{ kind: "upsert", table: "runs", row: run }]);
    setForm(emptyForm());
    router.push("/history");
  }

  return (
    <main className="flex flex-col gap-5 p-4">
      <h1 className="text-3xl font-bold">Log run</h1>

      <Field label="Date" htmlFor="run-date">
        <input id="run-date" type="date" value={form.date} max={localIsoDate(new Date())} onChange={(e) => set({ date: e.target.value })} className={inputClass} />
      </Field>

      <Field label="Kind">
        <div className="grid grid-cols-4 gap-2">
          {KINDS.map((k) => (
            <Choice key={k.value} selected={form.kind === k.value} onClick={() => set({ kind: k.value })}>
              {k.label}
            </Choice>
          ))}
        </div>
      </Field>

      <Field label="Distance (km)" htmlFor="run-distance">
        <input id="run-distance" inputMode="decimal" placeholder="0.0" value={form.distance} onChange={(e) => set({ distance: e.target.value })} className={inputClass} />
      </Field>

      <Field label="Duration">
        <div className="flex items-center gap-2">
          <input inputMode="numeric" placeholder="min" aria-label="Minutes" value={form.minutes} onChange={(e) => set({ minutes: e.target.value })} className={inputClass} />
          <span className="text-2xl text-zinc-500">:</span>
          <input inputMode="numeric" placeholder="sec" aria-label="Seconds" value={form.seconds} onChange={(e) => set({ seconds: e.target.value })} className={inputClass} />
        </div>
      </Field>

      <p className="text-lg">
        <span className="text-zinc-500">Pace </span>
        <span className="text-2xl font-bold tabular-nums">{preview ? formatPace(preview.distance_km, preview.duration_sec) : "—"}</span>
      </p>

      <Field label="Effort (1–10, optional)">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <Choice key={n} selected={form.effort === n} onClick={() => set({ effort: form.effort === n ? null : n })}>
              {n}
            </Choice>
          ))}
        </div>
      </Field>

      <Field label="Notes" htmlFor="run-notes">
        <textarea id="run-notes" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} className={`${inputClass} h-auto py-3`} />
      </Field>

      <button
        onClick={save}
        disabled={!preview}
        className="min-h-16 rounded-2xl bg-lime-400 text-2xl font-bold text-black active:bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        Save run
      </button>
    </main>
  );
}

/** With `htmlFor`, a real label for that input; otherwise a labelled group (buttons, min + sec). */
function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  if (htmlFor) {
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={htmlFor} className="text-zinc-400">
          {label}
        </label>
        {children}
      </div>
    );
  }
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-zinc-400">{label}</span>
      {children}
    </div>
  );
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`h-12 rounded-xl text-lg font-semibold ${selected ? "bg-sky-400 text-black" : "bg-zinc-800 text-zinc-200"}`}
    >
      {children}
    </button>
  );
}
