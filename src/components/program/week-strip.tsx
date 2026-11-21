import { WEEKDAYS } from "@/lib/program";
import type { ProgramDay, Week } from "@/lib/types";

type Day = Pick<ProgramDay, "code" | "name">;

/** A week at a glance, Monday to Sunday: a day's code, or a dashed cell for rest. */
export function WeekStrip({ week, days, size = "md" }: { week: Week; days: Day[]; size?: "sm" | "md" }) {
  const nameOf = (code: string | null) => days.find((d) => d.code === code)?.name ?? "rest";
  const label = WEEKDAYS.map((weekday, i) => `${weekday} ${nameOf(week[i])}`).join(", ");
  return (
    <span role="img" aria-label={label} className="flex flex-col gap-1">
      <span aria-hidden className="type-label grid grid-cols-7 gap-[3px] text-center text-xs text-fg-3">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday[0]}</span>
        ))}
      </span>
      <span aria-hidden className="grid grid-cols-7 gap-[3px]">
        {week.map((code, i) => (
          <span
            key={WEEKDAYS[i]}
            className={`type-display grid place-items-center ${size === "sm" ? "h-[26px] text-sm" : "h-[34px] text-base"} ${
              code ? "bg-fg text-bg" : "border border-dashed border-fg-3 text-fg-3"
            }`}
          >
            {code ?? "–"}
          </span>
        ))}
      </span>
    </span>
  );
}
