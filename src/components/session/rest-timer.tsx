"use client";

import { useEffect, useState } from "react";
import { card, eyebrow } from "../ui";

/** Countdown to `endsAt` (epoch ms). Derived from the clock, so it stays right after the phone sleeps. */
export function RestTimer({ endsAt, totalSeconds }: { endsAt: number; totalSeconds: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const over = left === 0;

  return (
    <section className={`${card} relative flex-1 overflow-hidden px-4 py-3 ${over ? "border-accent bg-accent-soft" : ""}`}>
      <p className={over ? `${eyebrow} text-accent` : eyebrow}>{over ? "Rest over" : "Rest"}</p>
      <p className={`text-[40px] leading-tight font-extrabold tracking-tight tabular-nums ${over ? "text-accent" : ""}`}>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </p>
      <div className="absolute bottom-0 left-0 h-1 bg-accent transition-[width] duration-300" style={{ width: `${(left / totalSeconds) * 100}%` }} />
    </section>
  );
}
