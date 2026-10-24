"use client";

import { useRef, useState, type ReactNode } from "react";
import { MinusIcon, PlusIcon } from "../icons";

const LONG_PRESS_MS = 450;

/**
 * A big −/+ button. With `onLongPress`, holding it fires that instead of
 * `onPress` (used for the 1 kg fine step).
 */
function StepButton({ direction, onPress, onLongPress }: { direction: 1 | -1; onPress: () => void; onLongPress?: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <button
      type="button"
      aria-label={direction === 1 ? "Increase" : "Decrease"}
      className="grid h-16 w-[76px] shrink-0 touch-manipulation place-items-center rounded-2xl bg-surface-2 select-none active:bg-line"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={() => {
        longPressed.current = false;
        if (!onLongPress) return;
        timer.current = setTimeout(() => {
          longPressed.current = true;
          navigator.vibrate?.(15);
          onLongPress();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onClick={() => {
        if (!longPressed.current) onPress();
      }}
    >
      {direction === 1 ? <PlusIcon className="size-7" /> : <MinusIcon className="size-7" />}
    </button>
  );
}

export function Stepper({
  label,
  children,
  onStep,
  fineStep,
}: {
  label: string;
  children: ReactNode;
  onStep: (direction: 1 | -1) => void;
  /** Long-press step, if any. */
  fineStep?: (direction: 1 | -1) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <StepButton direction={-1} onPress={() => onStep(-1)} onLongPress={fineStep && (() => fineStep(-1))} />
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <span className="mb-0.5 text-xs font-semibold tracking-[0.08em] text-fg-3 uppercase">{label}</span>
        {children}
      </div>
      <StepButton direction={1} onPress={() => onStep(1)} onLongPress={fineStep && (() => fineStep(1))} />
    </div>
  );
}

export const stepperValue = "text-[46px] leading-none font-extrabold tracking-tight tabular-nums";

/** Weight value: also a numeric field, so a first working weight can be typed in. */
export function WeightField({ value, onChange, placeholder }: { value: number | null; onChange: (kg: number | null) => void; placeholder: string }) {
  const [text, setText] = useState<string | null>(null); // non-null only while editing

  return (
    <input
      inputMode="decimal"
      aria-label="Weight in kg"
      placeholder={placeholder}
      value={text ?? (value === null ? "" : String(value))}
      onFocus={(e) => {
        setText(value === null ? "" : String(value));
        e.currentTarget.select();
      }}
      onBlur={() => setText(null)}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        setText(raw);
        if (raw.trim() === "") return onChange(null);
        const kg = Number(raw);
        if (Number.isFinite(kg) && kg >= 0) onChange(kg);
      }}
      className={`${stepperValue} w-full bg-transparent text-center outline-none placeholder:text-base placeholder:font-medium placeholder:tracking-normal placeholder:text-fg-3`}
    />
  );
}
