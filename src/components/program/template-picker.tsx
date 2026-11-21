"use client";

import { weekFromSchedule } from "@/lib/program";
import type { Template } from "@/lib/types";
import { programBlurb } from "./program-copy";
import { WeekStrip } from "./week-strip";

/** One row per program: days a week first, then what makes it different and its default week. Fewest days first. */
export function TemplatePicker({
  templates,
  usedBefore,
  onPick,
}: {
  templates: Template[];
  /** Templates the user had before: their row shows the user's own version. */
  usedBefore: string[];
  onPick: (template: Template) => void;
}) {
  const sorted = [...templates].sort((a, b) => a.schedule.length - b.schedule.length);
  return (
    <ul className="flex flex-col">
      {sorted.map((t) => {
        const blurb = programBlurb(t.name);
        const days = t.schedule.length;
        return (
          <li key={t.id}>
            <button
              onClick={() => onPick(t)}
              aria-label={`${t.name}, ${days} days a week`}
              aria-describedby={blurb ? `blurb-${t.id}` : undefined}
              className="flex w-full flex-col gap-2 border-t-[3px] border-fg pt-2.5 pb-4 text-left active:bg-surface"
            >
              <span className="flex w-full items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="type-display block text-[30px]">{t.name}</span>
                  {usedBefore.includes(t.id) && <span className="type-label mt-1 block text-xs text-fg-2">Your version</span>}
                  {blurb && (
                    <span id={`blurb-${t.id}`} className="mt-1 block text-sm leading-snug text-fg-2">
                      {blurb}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-center">
                  <span className="type-display text-[44px] text-accent tabular-nums">{days}</span>
                  <span className="type-label text-xs text-fg-2">days</span>
                </span>
              </span>
              <WeekStrip week={weekFromSchedule(t.schedule, t.days)} days={t.days} size="sm" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
