"use client";

import { useState } from "react";
import { WEEKDAYS } from "@/lib/program";
import type { ProgramDay, Week } from "@/lib/types";
import { DayCode } from "../ui";

type Day = Pick<ProgramDay, "code" | "name">;
type Choice = { code: string | null; name: string };

/**
 * Paint the week: choose a session (or Rest) in the bar at the bottom, then tap the weekdays that get it.
 * A day can be placed on several weekdays.
 */
export function WeekEditor({ days, week, onChange }: { days: Day[]; week: Week; onChange: (week: Week) => void }) {
  // The code being placed; null places Rest.
  const [brush, setBrush] = useState<string | null>(days[0]?.code ?? null);
  const [flashed, setFlashed] = useState<number | null>(null);
  const nameOf = (code: string | null) => days.find((d) => d.code === code)?.name ?? "Rest";
  const choices: Choice[] = [...days, { code: null, name: "Rest" }];
  const sessions = week.filter((c) => c !== null).length;

  function paint(index: number) {
    onChange(week.map((c, i) => (i === index ? brush : c)));
    setFlashed(index);
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="border-t-[3px] border-fg">
        {WEEKDAYS.map((weekday, i) => {
          const code = week[i];
          return (
            <li key={weekday}>
              <button
                type="button"
                onClick={() => paint(i)}
                aria-label={`${weekday}, ${nameOf(code)}`}
                aria-describedby="week-hint"
                className="flex h-[54px] w-full touch-manipulation items-center gap-3 border-b border-line text-left active:bg-surface"
              >
                <span className="type-display w-12 text-[22px]">{weekday.slice(0, 3)}</span>
                <span
                  onAnimationEnd={() => setFlashed(null)}
                  className={`flex items-center gap-2.5 text-[17px] ${code ? "type-name" : "text-fg-3"} ${flashed === i ? "motion-safe:animate-flash" : ""}`}
                >
                  {code && <DayCode code={code} />}
                  {nameOf(code)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2">
        <p id="week-hint" className="text-sm text-fg-2">
          Tap a day to set it to {nameOf(brush)}
        </p>
        <div role="radiogroup" aria-label="Session to place" className="flex flex-wrap gap-1.5">
          {choices.map((c) => (
            <button
              key={c.code ?? "rest"}
              type="button"
              role="radio"
              aria-checked={brush === c.code}
              onClick={() => setBrush(c.code)}
              className={`type-name h-[52px] flex-auto touch-manipulation border-2 px-3 text-base ${
                brush === c.code ? "border-accent bg-accent text-on-accent" : "border-fg text-fg active:bg-surface"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <p aria-live="polite" className="text-sm text-fg-2 tabular-nums">
          {sessions} session{sessions === 1 ? "" : "s"} a week
          {days.map((d) => ` · ${d.name} ×${week.filter((c) => c === d.code).length}`).join("")}
        </p>
      </div>
    </div>
  );
}
