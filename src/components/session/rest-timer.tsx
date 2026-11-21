"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Countdown to `endsAt` (epoch ms). Derived from the clock, so it stays right after the phone sleeps.
 * `children` sits in the band's top row (Undo).
 */
export function RestTimer({ endsAt, totalSeconds, children }: { endsAt: number; totalSeconds: number; children?: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const over = left === 0;

  return (
    <section aria-label="Rest timer" className={`relative overflow-hidden border-2 px-3 pt-1 pb-3 ${over ? "border-fg bg-fg text-bg" : "border-fg"}`}>
      <div className="flex min-h-12 items-center justify-between">
        <p className="type-label text-xs">{over ? "Rest over" : "Rest"}</p>
        {children}
      </div>
      <p role="timer" className="type-number text-[54px]">
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </p>
      <div
        className="absolute bottom-0 left-0 h-1.5 bg-accent motion-safe:transition-[width] motion-safe:duration-300"
        style={{ width: `${(left / totalSeconds) * 100}%` }}
      />
    </section>
  );
}
