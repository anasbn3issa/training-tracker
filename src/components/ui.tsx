import type { ButtonHTMLAttributes, ReactNode } from "react";
import { DumbbellIcon, RunIcon } from "./icons";

export const card = "rounded-[18px] border border-line bg-surface";
export const eyebrow = "text-xs font-semibold uppercase tracking-[0.08em] text-fg-3";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`flex min-h-16 touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-accent px-4 text-xl font-bold text-on-accent active:bg-accent-press disabled:bg-surface-2 disabled:text-fg-3 ${className}`}
      {...props}
    />
  );
}

export function GhostButton({ className = "", ...props }: ButtonProps) {
  return <button className={`h-12 rounded-xl px-3 text-[15px] font-medium text-fg-2 active:bg-surface ${className}`} {...props} />;
}

export function IconButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`grid size-12 shrink-0 touch-manipulation place-items-center rounded-[14px] bg-surface-2 text-fg active:bg-line disabled:opacity-30 ${className}`}
      {...props}
    />
  );
}

/** Day code (A–D) in an orange tile: marks lifting sessions. */
export function DayBadge({ code }: { code: string }) {
  return <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-[17px] font-extrabold text-accent">{code}</span>;
}

/** Day code (A–D) for program sessions, a dumbbell for custom workouts. */
export function SessionBadge({ dayCode }: { dayCode: string | null }) {
  if (dayCode !== null) return <DayBadge code={dayCode} />;
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
      <DumbbellIcon className="size-5" />
    </span>
  );
}

/** Blue tile: marks runs. */
export function RunBadge() {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-run-soft text-run">
      <RunIcon className="size-5" />
    </span>
  );
}

export function Loading() {
  return <p className="p-4 text-fg-3">Loading…</p>;
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-[32px] font-extrabold tracking-tight">{children}</h1>;
}
