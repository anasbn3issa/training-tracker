"use client";

import { useEffect, useState } from "react";

/** Countdown to `endsAt` (epoch ms). Derived from the clock, so it stays right after the phone sleeps. */
export function RestTimer({ endsAt }: { endsAt: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  if (endsAt === null) return null;
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const over = left === 0;

  return (
    <div className={`rounded-xl px-4 py-2 text-center ${over ? "bg-lime-400 text-black" : "bg-zinc-900"}`}>
      <span className="text-sm uppercase tracking-wide opacity-70">{over ? "Rest over" : "Rest"}</span>
      <p className="text-5xl font-bold tabular-nums">
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </p>
    </div>
  );
}
