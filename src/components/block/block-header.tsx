import { blockPhase, effortCue } from "@/lib/progression";
import { MinusIcon, PlusIcon } from "../icons";
import { IconButton } from "../ui";
import { BlockBar } from "./block-bar";
import { PHASE_LABEL } from "./phase-label";

// Only when there is something to know about next week.
const NEXT_WEEK: Partial<Record<number, string>> = {
  4: "Peak week next, then deload",
  5: "Next week: deload",
  6: "Block restarts at week 1 next week",
};

/**
 * Where you are in the block and what this week asks of you.
 * `onChangeWeek` shows the −/+ buttons that correct the week (hidden during a workout).
 */
export function BlockHeader({ week, onChangeWeek }: { week: number; onChangeWeek?: (delta: 1 | -1) => void }) {
  const deload = blockPhase(week) === "deload";
  const next = NEXT_WEEK[week];
  return (
    <section aria-label="Training block" className="flex flex-col">
      <BlockBar week={week} />
      {/* The title gets the full width: "DELOAD" at 76px already fills a 390px phone. */}
      <h1 className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
        <span className="type-display text-[76px] tabular-nums">{deload ? "Deload" : `Week ${week}`}</span>
        <span className="type-display text-[30px] text-accent">{deload ? "Week 6" : PHASE_LABEL[blockPhase(week)]}</span>
      </h1>
      <p className="mt-2 text-[21px] leading-tight font-bold">{effortCue(week)}</p>
      {(next || onChangeWeek) && (
        <div className="mt-2.5 flex items-center justify-between gap-3">
          {next ? <p className="type-label border-2 border-fg px-2.5 py-1.5 text-[13px]">{next}</p> : <span />}
          {onChangeWeek && (
            <div className="flex shrink-0 gap-2">
              <IconButton aria-label="Previous week" onClick={() => onChangeWeek(-1)} disabled={week === 1}>
                <MinusIcon />
              </IconButton>
              <IconButton aria-label="Next week" onClick={() => onChangeWeek(1)} disabled={week === 6}>
                <PlusIcon />
              </IconButton>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
