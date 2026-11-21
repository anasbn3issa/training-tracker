"use client";

import { memo } from "react";
import { dayPrescriptions, formatWeekdays, weekdaysOf } from "@/lib/program";
import { setsForWeek, suggestionFor } from "@/lib/progression";
import type { LogState, Program, ProgramDay } from "@/lib/types";
import { DayCode, SectionHead, WeightUpTag } from "./ui";

/**
 * Today's session: its exercises with this week's sets, and a tag where the weight goes up.
 * Memoized: the suggestions scan the whole log, and Today re-renders on every keystroke of a custom title.
 */
export const TodayExercises = memo(function TodayExercises({
  program,
  log,
  day,
  week,
}: {
  program: Program;
  log: LogState;
  day: ProgramDay;
  week: number;
}) {
  const exercises = dayPrescriptions(program, day.id).map((p) => {
    const exercise = program.exercises.find((e) => e.id === p.exercise_id);
    const advanced = exercise !== undefined && suggestionFor(log, day.id, p, exercise.increment_kg, week).advanced;
    return { ...p, name: exercise?.name ?? p.exercise_id, incrementKg: exercise?.increment_kg ?? 0, advanced };
  });

  return (
    <section>
      <SectionHead
        title={
          <span className="flex items-center gap-2.5">
            <DayCode code={day.code} />
            {day.name}
          </span>
        }
        meta={`${formatWeekdays(weekdaysOf(program, day.id))} · ${exercises.length} lifts`}
      />
      <ul>
        {exercises.map((e) => (
          <li key={e.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="type-name text-[17px]">{e.name}</span>
              {e.advanced && <WeightUpTag kg={e.incrementKg} />}
            </span>
            <span className="shrink-0 text-[15px] font-medium text-fg-2 tabular-nums">
              {setsForWeek(e.base_sets, week)} × {e.rep_low}–{e.rep_high}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
});
