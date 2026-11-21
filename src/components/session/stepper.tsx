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
      className="grid h-16 w-[72px] shrink-0 touch-manipulation place-items-center border-2 border-fg select-none active:bg-surface"
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
        <span className="type-label mb-1 text-xs text-fg-2">{label}</span>
        {children}
      </div>
      <StepButton direction={1} onPress={() => onStep(1)} onLongPress={fineStep && (() => fineStep(1))} />
    </div>
  );
}

export const stepperValue = "type-number text-[46px]";

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
      className={`${stepperValue} w-full bg-transparent text-center outline-none placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:text-fg-3`}
    />
  );
}
