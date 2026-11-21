"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/types";
import { GhostButton } from "../ui";

/** The shared catalog, searchable. Exercises already in the day are left out. */
export function ExercisePicker({
  exercises,
  exclude,
  title,
  onPick,
  onCancel,
}: {
  exercises: Exercise[];
  exclude: string[];
  title: string;
  onPick: (exerciseId: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = exercises.filter((e) => !exclude.includes(e.id) && e.name.toLowerCase().includes(q));
  return (
    <div className="flex flex-col gap-3">
      <h2 className="type-display text-[30px]">{title}</h2>
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
        className="h-14 border-2 border-line bg-bg px-4 text-lg outline-none placeholder:text-fg-3 focus:border-accent"
      />
      <ul className="border-t-[3px] border-fg">
        {matches.map((e) => (
          <li key={e.id}>
            <button onClick={() => onPick(e.id)} className="type-name flex min-h-14 w-full items-center border-b border-line text-left text-[17px] active:bg-surface">
              {e.name}
            </button>
          </li>
        ))}
        {matches.length === 0 && <li className="py-3 text-fg-2">Not in the catalog yet.</li>}
      </ul>
      <GhostButton onClick={onCancel}>Cancel</GhostButton>
    </div>
  );
}
