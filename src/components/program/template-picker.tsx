"use client";

import { dayPrescriptions, orderDays } from "@/lib/program";
import type { Exercise, Template } from "@/lib/types";
import { DayBadge, card } from "../ui";

/** One card per program to choose: its days and their exercises, so the choice is informed. */
export function TemplatePicker({
  templates,
  exercises,
  usedBefore,
  onPick,
}: {
  templates: Template[];
  exercises: Exercise[];
  /** Templates the user had before: their card shows the user's own version. */
  usedBefore: string[];
  onPick: (template: Template) => void;
}) {
  const name = (id: string) => exercises.find((e) => e.id === id)?.name ?? id;
  return (
    <ul className="flex flex-col gap-3">
      {templates.map((t) => (
        <li key={t.id}>
          <button onClick={() => onPick(t)} className={`${card} flex w-full flex-col gap-3 p-4 text-left active:bg-surface-2`}>
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-xl font-bold">{t.name}</span>
              <span className="shrink-0 text-[13px] text-fg-3">
                {usedBefore.includes(t.id) ? "Your version · " : ""}
                {t.schedule.length}× a week
              </span>
            </span>
            {orderDays(t.days, t.schedule).map((d) => (
              <span key={d.id} className="flex items-start gap-3">
                <DayBadge code={d.code} />
                <span className="min-w-0">
                  <span className="block font-semibold">{d.name}</span>
                  <span className="block text-[13px] leading-snug text-fg-3">
                    {dayPrescriptions({ prescriptions: t.prescriptions }, d.id)
                      .map((p) => name(p.exercise_id))
                      .join(", ")}
                  </span>
                </span>
              </span>
            ))}
          </button>
        </li>
      ))}
    </ul>
  );
}
