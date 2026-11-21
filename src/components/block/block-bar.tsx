import { blockPhase, type BlockPhase } from "@/lib/progression";
import { PHASE_LABEL } from "./phase-label";

// Plate height = how hard the week is (viewBox units).
const PLATE_HEIGHT: Record<BlockPhase, number> = { ramp: 48, build: 72, peak: 100, deload: 30 };
const WEEKS = [1, 2, 3, 4, 5, 6];
const PLATE_W = 28;
const GAP = 8;
const FIRST_X = 58;
const AXIS_Y = 60;

function plateClass(plate: number, week: number): string {
  if (plate === week) return "fill-accent stroke-accent";
  if (week === 6) return "fill-none stroke-fg-3"; // deload: the plates are off
  if (plate < week) return "fill-fg-3 stroke-fg-3";
  return "fill-none stroke-fg";
}

/** The 6-week block as a loaded barbell: one plate per week, sized by how hard the week is. */
export function BlockBar({ week }: { week: number }) {
  return (
    <svg viewBox="0 0 324 138" className="block h-auto w-full max-w-[360px]" role="img" aria-label={`Week ${week} of 6, ${PHASE_LABEL[blockPhase(week)]}`}>
      <rect x="0" y={AXIS_Y - 4} width="324" height="8" className="fill-fg-3" />
      <rect x="38" y={AXIS_Y - 16} width="10" height="32" className="fill-fg-2" />
      {WEEKS.map((plate, i) => {
        const h = PLATE_HEIGHT[blockPhase(plate)];
        const x = FIRST_X + i * (PLATE_W + GAP);
        const dashed = plate !== week && (week === 6 || plate === 6);
        return (
          <g key={plate}>
            <rect
              x={x}
              y={AXIS_Y - h / 2}
              width={PLATE_W}
              height={h}
              strokeWidth={2}
              strokeDasharray={dashed ? "4 3" : undefined}
              className={`${plateClass(plate, week)} motion-safe:transition-colors motion-safe:duration-200`}
            />
            <text x={x + PLATE_W / 2} y="132" textAnchor="middle" className={`type-label text-[13px] ${plate === week ? "fill-accent" : "fill-fg-2"}`}>
              {plate === 6 ? "DL" : `W${plate}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
