import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronLeftIcon, DumbbellIcon, RunIcon } from "./icons";

/** @deprecated Boxed cards are gone in the redesign. Removed in Task 11. */
export const card = "border border-line bg-surface";
export const eyebrow = "type-label text-xs text-fg-2";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** The one main action of a screen. `tall` for the workout screen. */
export function PrimaryButton({ className = "", tall = false, ...props }: ButtonProps & { tall?: boolean }) {
  return (
    <button
      className={`type-display flex ${tall ? "min-h-[72px]" : "min-h-16"} touch-manipulation items-center justify-center gap-2 bg-accent px-4 text-[28px] text-on-accent active:bg-accent-press disabled:bg-surface disabled:text-fg-3 ${className}`}
      {...props}
    />
  );
}

/** Secondary actions: Change program, Another day. */
export function OutlineButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`type-label flex h-[52px] touch-manipulation items-center justify-center border-2 border-fg px-4 text-base text-fg active:bg-surface disabled:border-line disabled:text-fg-3 ${className}`}
      {...props}
    />
  );
}

export function GhostButton({ className = "", ...props }: ButtonProps) {
  return <button className={`h-12 px-3 text-[15px] font-medium text-fg-2 active:bg-surface disabled:opacity-40 ${className}`} {...props} />;
}

export function IconButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`grid size-12 shrink-0 touch-manipulation place-items-center border-2 border-fg text-fg active:bg-surface disabled:border-line disabled:text-fg-3 ${className}`}
      {...props}
    />
  );
}

const backClass = "-ml-1 flex h-12 items-center gap-0.5 self-start pr-2 text-[15px] font-medium text-fg-2 disabled:opacity-40";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={backClass}>
      <ChevronLeftIcon className="size-5" />
      {children}
    </Link>
  );
}

export function BackButton({ className = "", children, ...props }: ButtonProps) {
  return (
    <button type="button" className={`${backClass} ${className}`} {...props}>
      <ChevronLeftIcon className="size-5" />
      {children}
    </button>
  );
}

/** A program day's code (A, Pu, U…) on a chalk tile. */
export function DayCode({ code, size = "md" }: { code: string; size?: "md" | "lg" }) {
  return (
    <span
      className={`type-display grid shrink-0 place-items-center bg-fg px-1 text-bg ${size === "lg" ? "h-12 min-w-12 text-[26px]" : "h-[34px] min-w-[34px] text-[19px]"}`}
    >
      {code}
    </span>
  );
}

/** @deprecated Use DayCode. Removed in Task 11. */
export const DayBadge = DayCode;

/** The day's code for program sessions, a dumbbell for custom workouts. */
export function SessionBadge({ dayCode }: { dayCode: string | null }) {
  if (dayCode !== null) return <DayCode code={dayCode} />;
  return (
    <span className="grid size-[34px] shrink-0 place-items-center bg-fg text-bg">
      <DumbbellIcon className="size-5" />
    </span>
  );
}

/** Blue tile: marks runs. */
export function RunBadge() {
  return (
    <span className="grid size-[34px] shrink-0 place-items-center bg-run text-bg">
      <RunIcon className="size-5" />
    </span>
  );
}

/** A section under a thick chalk rule. */
export function SectionHead({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 border-t-[3px] border-fg pt-2 pb-1">
      <h2 className="type-display min-w-0 text-[26px]">{title}</h2>
      {meta && <span className="shrink-0 text-right text-sm text-fg-2">{meta}</span>}
    </div>
  );
}

/** The weight went up because every set hit the top of the range. */
export function WeightUpTag({ kg }: { kg: number }) {
  return <span className="type-label shrink-0 bg-accent px-1.5 py-0.5 text-xs text-on-accent">+{kg} kg</span>;
}

/** Where the week sits in the block, e.g. "Wk 5 · Peak". */
export function PhaseTag({ children }: { children: ReactNode }) {
  return <span className="type-label shrink-0 border-2 border-accent px-1.5 py-0.5 text-xs text-accent">{children}</span>;
}

export function OfflineNotice() {
  return (
    <p role="status" className="border-2 border-fg px-3 py-2 text-[15px] font-semibold">
      You&apos;re offline. Program changes need a connection.
    </p>
  );
}

export function Loading() {
  return <p className="p-4 text-fg-2">Loading…</p>;
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <h1 className="type-display text-[52px]">{children}</h1>;
}
