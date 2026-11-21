"use client";

import { WEEKDAYS } from "@/lib/program";
import type { ProgramDay, Week } from "@/lib/types";
import { card } from "../ui";

type Day = Pick<ProgramDay, "code" | "name">;

function Chip({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      className={`h-10 min-w-11 touch-manipulation rounded-xl px-2.5 text-[15px] font-bold ${
        selected ? "bg-accent text-on-accent" : "bg-surface-2 text-fg-2 active:bg-line"
      }`}
    >
      {children}
    </button>
  );
}

/** Seven rows, Monday to Sunday: pick a day of the program or Rest. A day can be picked on several weekdays. */
export function WeekEditor({ days, week, onChange }: { days: Day[]; week: Week; onChange: (week: Week) => void }) {
  const set = (index: number, code: string | null) => onChange(week.map((c, i) => (i === index ? code : c)));
  return (
    <div className="flex flex-col gap-2">
      <ul className={`${card} divide-y divide-line`}>
        {WEEKDAYS.map((weekday, i) => (
          <li key={weekday} className="flex items-center gap-3 px-3.5 py-2.5">
            <span className="w-10 shrink-0 text-[15px] font-semibold">{weekday.slice(0, 3)}</span>
            <div role="radiogroup" aria-label={weekday} className="flex flex-1 flex-wrap gap-1.5">
              <Chip selected={week[i] === null} onClick={() => set(i, null)} label="Rest">
                Rest
              </Chip>
              {days.map((d) => (
                <Chip key={d.code} selected={week[i] === d.code} onClick={() => set(i, d.code)} label={d.name}>
                  {d.code}
                </Chip>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-fg-3">{days.map((d) => `${d.code} ${d.name}`).join(" · ")}</p>
    </div>
  );
}
