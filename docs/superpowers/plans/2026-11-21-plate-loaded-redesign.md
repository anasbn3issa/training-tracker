# Plate loaded redesign: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole app in the "Plate loaded" direction, make the 6-week block readable at a glance, and make the program screens easier, without changing logic, routes or API contracts.

**Architecture:** New design tokens and Archivo go into `globals.css` and `layout.tsx`. `src/components/ui.tsx` gets the shared primitives. Two new folders hold the signature pieces: `src/components/block/` (BlockBar, BlockHeader) and the program building blocks in `src/components/program/` (WeekStrip, a painting WeekEditor, program copy). The screens are then rewritten one at a time, in the brief's priority order. `src/lib` only gains `blockPhase` (tested) and the `useOnline` hook.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4 (`@theme`, `@utility`), `next/font/google`, Vitest.

**Spec:** [`docs/superpowers/specs/2026-11-21-plate-loaded-redesign-design.md`](../specs/2026-11-21-plate-loaded-redesign-design.md)

## Global constraints

- Next.js 16 differs from what you know. Read `node_modules/next/dist/docs/` before writing Next-specific code (fonts: `01-app/03-api-reference/02-components/font.md`).
- No new npm dependency. The only new font is Archivo through `next/font/google`.
- Don't change logic in `src/lib` except for adding `blockPhase` (Task 1) and `use-online.ts` (Task 6). Existing tests stay green.
- Routes, API routes and the shapes sent to them stay identical. All writes go through `useData().apply` or the existing `program-api.ts` functions.
- Touch targets are at least 48px. Nothing depends on hover. The smallest text is 12px. All numbers use `tabular-nums` (or `type-number`).
- Corner radius is 0. No `rounded-*` classes, gradients, `backdrop-blur`, shadows or emoji.
- Every animation is wrapped in `motion-safe:`.
- Keep roles, `aria-label`s, `aria-pressed`, `aria-checked` and `aria-expanded` where they exist today.
- TypeScript: no `as` casts (Anas's rule). Use annotations and type guards instead.
- Copy is plain and short, with no exclamation marks. Uppercase only comes from `type-display` and `type-label`, never typed in caps.
- After every task, run `npm test`, `npx tsc --noEmit` and `npx eslint src`. All three must pass.
- Commit only after Anas has seen the screenshots of the task and said OK. Commit messages have no `Co-Authored-By` line. No PR until Anas asks.

## How to take screenshots

Start the app with `npm run dev`. The local Supabase runs on the native dockerd engine (`npm run db:start` if it is down). Sign in, then open Chrome DevTools in device mode at **390 × 844**. Save the screenshots in the scratchpad and send them to Anas. Each task lists the states to capture.

---

### Task 1: `blockPhase` helper

**Files:**
- Modify: `src/lib/progression.ts` (append after `effortCue`)
- Test: `src/lib/progression.test.ts`

**Interfaces:**
- Produces: `export type BlockPhase = "ramp" | "build" | "peak" | "deload"` and `export function blockPhase(week: number): BlockPhase`

- [ ] **Step 1: Write the failing test.** In `src/lib/progression.test.ts`, add `blockPhase` to the import from `./progression`, then append:

```ts
describe("blockPhase", () => {
  it("maps the six weeks to ramp, build, peak and deload", () => {
    expect([1, 2, 3, 4, 5, 6].map(blockPhase)).toEqual(["ramp", "ramp", "build", "build", "peak", "deload"]);
  });
});
```

- [ ] **Step 2: Run it and check that it fails.** Run `npx vitest run src/lib/progression.test.ts`. Expected: FAIL, because `blockPhase` is not exported.

- [ ] **Step 3: Implement it.** In `src/lib/progression.ts`, under `export const effortCue = …`, add:

```ts
export type BlockPhase = "ramp" | "build" | "peak" | "deload";

/** What a week of the block asks for: ramp (1–2), build (3–4), peak (5), deload (6). */
export function blockPhase(week: number): BlockPhase {
  if (week <= 2) return "ramp";
  if (week <= 4) return "build";
  return week === 5 ? "peak" : "deload";
}
```

- [ ] **Step 4: Run the checks.** `npm test`, `npx tsc --noEmit` and `npx eslint src`. Expected: all pass.

- [ ] **Step 5: Commit.** Do this together with Task 2, after the screenshots.

---

### Task 2: Foundations: tokens, Archivo, primitives

**Files:**
- Modify: `src/app/globals.css` (full rewrite)
- Modify: `src/app/layout.tsx`
- Modify: `src/app/manifest.ts:10-11`
- Modify: `src/components/ui.tsx` (full rewrite)

**Interfaces:**
- Produces (Tailwind): colours `bg surface line fg fg-2 fg-3 accent accent-press on-accent run danger`; utilities `type-display`, `type-label`, `type-name`, `type-number`; animation `animate-flash`.
- Produces (`ui.tsx`):
  - `PrimaryButton(props & { tall?: boolean })`
  - `OutlineButton(props)`, `GhostButton(props)`, `IconButton(props)`
  - `BackLink({ href, children })`, `BackButton(props)`
  - `DayCode({ code, size?: "md" | "lg" })`, `SessionBadge({ dayCode })`, `RunBadge()`
  - `SectionHead({ title, meta? })`
  - `WeightUpTag({ kg })`, `PhaseTag({ children })`
  - `OfflineNotice()`, `Loading()`, `ScreenTitle({ children })`
  - `eyebrow` (class string)
  - Kept only until Task 11: `card`, `DayBadge`.

- [ ] **Step 1: Rewrite `src/app/globals.css`.**

```css
@import "tailwindcss";

/* Plate loaded. Dark only: warm black, chalk, one safety-orange accent for
   "now", "do this" and "it went up". Blue only tells runs apart. */
@theme {
  --color-bg: #0d0d0b;
  --color-surface: #181815;
  --color-line: #2a2925;
  --color-fg: #f1eee6;
  --color-fg-2: #a9a59a;
  --color-fg-3: #6f6b62;
  --color-accent: #ff5a1f;
  --color-accent-press: #ff7440;
  --color-on-accent: #160700;
  --color-run: #4c8dff;
  --color-danger: #ff4d4d;

  /* Legacy, removed in Task 11 once no screen uses them. */
  --color-surface-2: #181815;
  --color-accent-soft: rgb(255 90 31 / 0.14);
  --color-accent-dim: rgb(255 90 31 / 0.45);
  --color-run-soft: rgb(76 141 255 / 0.14);

  --animate-flash: flash 300ms ease-out;
  @keyframes flash {
    from {
      color: var(--color-accent);
    }
  }
}

@theme inline {
  --font-sans: var(--font-archivo), system-ui, sans-serif;
}

/* Archivo's width axis: 62 = stencil-narrow headings, 80 = labels and names. */
@utility type-display {
  font-variation-settings: "wdth" 62;
  font-weight: 900;
  text-transform: uppercase;
  line-height: 0.92;
}

@utility type-label {
  font-variation-settings: "wdth" 80;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

@utility type-name {
  font-variation-settings: "wdth" 80;
  font-weight: 700;
}

@utility type-number {
  font-variation-settings: "wdth" 80;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

:root {
  color-scheme: dark;
}

body {
  background: var(--color-bg);
  color: var(--color-fg);
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 2: Switch the font in `src/app/layout.tsx`.**

```tsx
import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Variable font with its width axis (62–125). Self-hosted at build time by next/font, so it also works offline.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "Training Tracker",
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Update the manifest colours.** In `src/app/manifest.ts`, set `background_color: "#0d0d0b"` and `theme_color: "#0d0d0b"`.

- [ ] **Step 4: Rewrite `src/components/ui.tsx`.**

```tsx
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
```

- [ ] **Step 5: Run the checks.** `npm test`, `npx tsc --noEmit` and `npx eslint src`. Expected: all pass. Callers that passed `className="min-h-[72px] …"` to `PrimaryButton` still compile; Tasks 5 and 9 switch them to `tall`.

- [ ] **Step 6: Screenshots and commit.** Capture Today, History and Run: old layouts in the new colours and font, as a sanity check. Once Anas says OK:

```bash
git add src/lib/progression.ts src/lib/progression.test.ts src/app/globals.css src/app/layout.tsx src/app/manifest.ts src/components/ui.tsx docs/
git commit -m "feat(ui): plate loaded tokens, Archivo and primitives"
```

---

### Task 3: BlockBar and BlockHeader

**Files:**
- Create: `src/components/block/phase-label.ts`
- Create: `src/components/block/block-bar.tsx`
- Create: `src/components/block/block-header.tsx`

**Interfaces:**
- Consumes: `blockPhase` and `BlockPhase` (Task 1), `effortCue` (existing), `IconButton` (Task 2).
- Produces:
  - `PHASE_LABEL: Record<BlockPhase, string>`
  - `BlockBar({ week }: { week: number })`
  - `BlockHeader({ week, onChangeWeek }: { week: number; onChangeWeek?: (delta: 1 | -1) => void })`

- [ ] **Step 1: Create `src/components/block/phase-label.ts`.**

```ts
import type { BlockPhase } from "@/lib/progression";

export const PHASE_LABEL: Record<BlockPhase, string> = { ramp: "Ramp", build: "Build", peak: "Peak", deload: "Deload" };
```

- [ ] **Step 2: Create `src/components/block/block-bar.tsx`.**

```tsx
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
```

- [ ] **Step 3: Create `src/components/block/block-header.tsx`.**

```tsx
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
      <div className="mt-1 flex items-end justify-between gap-3">
        <h1 className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="type-display text-[76px] tabular-nums">{deload ? "Deload" : `Week ${week}`}</span>
          <span className="type-display text-[30px] text-accent">{deload ? "Week 6" : PHASE_LABEL[blockPhase(week)]}</span>
        </h1>
        {onChangeWeek && (
          <div className="flex shrink-0 gap-2 pb-2">
            <IconButton aria-label="Previous week" onClick={() => onChangeWeek(-1)} disabled={week === 1}>
              <MinusIcon />
            </IconButton>
            <IconButton aria-label="Next week" onClick={() => onChangeWeek(1)} disabled={week === 6}>
              <PlusIcon />
            </IconButton>
          </div>
        )}
      </div>
      <p className="mt-2 text-[21px] leading-tight font-bold">{effortCue(week)}</p>
      {next && <p className="type-label mt-2.5 self-start border-2 border-fg px-2.5 py-1.5 text-[13px]">{next}</p>}
    </section>
  );
}
```

- [ ] **Step 4: Run the checks.** `npx tsc --noEmit` and `npx eslint src` pass. The components have no screen yet; Task 5 mounts them. No commit on its own: commit with Task 5.

---

### Task 4: WeekStrip and the painting WeekEditor

**Files:**
- Create: `src/components/program/week-strip.tsx`
- Modify: `src/components/program/week-editor.tsx` (full rewrite, same export and props)

**Interfaces:**
- Consumes: `WEEKDAYS` (`src/lib/program.ts`), `Week` and `ProgramDay` (`src/lib/types.ts`), `DayCode` (Task 2), the `animate-flash` utility (Task 2).
- Produces:
  - `WeekStrip({ week, days, size? }: { week: Week; days: Pick<ProgramDay, "code" | "name">[]; size?: "sm" | "md" })`
  - `WeekEditor({ days, week, onChange })`, with props unchanged from today.

- [ ] **Step 1: Create `src/components/program/week-strip.tsx`.** Spans only, so it can sit inside a button.

```tsx
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
```

- [ ] **Step 2: Rewrite `src/components/program/week-editor.tsx`.**

```tsx
"use client";

import { useState } from "react";
import { WEEKDAYS } from "@/lib/program";
import type { ProgramDay, Week } from "@/lib/types";
import { DayCode } from "../ui";

type Day = Pick<ProgramDay, "code" | "name">;
type Choice = { code: string | null; name: string };

/**
 * Paint the week: choose a session (or Rest) in the bar at the bottom, then tap the weekdays that get it.
 * A day can be placed on several weekdays.
 */
export function WeekEditor({ days, week, onChange }: { days: Day[]; week: Week; onChange: (week: Week) => void }) {
  // The code being placed; null places Rest.
  const [brush, setBrush] = useState<string | null>(days[0]?.code ?? null);
  const [flashed, setFlashed] = useState<number | null>(null);
  const nameOf = (code: string | null) => days.find((d) => d.code === code)?.name ?? "Rest";
  const choices: Choice[] = [...days, { code: null, name: "Rest" }];
  const sessions = week.filter((c) => c !== null).length;

  function paint(index: number) {
    onChange(week.map((c, i) => (i === index ? brush : c)));
    setFlashed(index);
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="border-t-[3px] border-fg">
        {WEEKDAYS.map((weekday, i) => {
          const code = week[i];
          return (
            <li key={weekday}>
              <button
                type="button"
                onClick={() => paint(i)}
                aria-label={`${weekday}, ${nameOf(code)}`}
                aria-describedby="week-hint"
                className="flex h-[54px] w-full touch-manipulation items-center gap-3 border-b border-line text-left active:bg-surface"
              >
                <span className="type-display w-12 text-[22px]">{weekday.slice(0, 3)}</span>
                <span
                  onAnimationEnd={() => setFlashed(null)}
                  className={`flex items-center gap-2.5 text-[17px] ${code ? "type-name" : "text-fg-3"} ${flashed === i ? "motion-safe:animate-flash" : ""}`}
                >
                  {code && <DayCode code={code} />}
                  {nameOf(code)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2">
        <p id="week-hint" className="text-sm text-fg-2">
          Tap a day to set it to {nameOf(brush)}
        </p>
        <div role="radiogroup" aria-label="Session to place" className="flex flex-wrap gap-1.5">
          {choices.map((c) => (
            <button
              key={c.code ?? "rest"}
              type="button"
              role="radio"
              aria-checked={brush === c.code}
              onClick={() => setBrush(c.code)}
              className={`type-name h-[52px] flex-auto touch-manipulation border-2 px-3 text-base ${
                brush === c.code ? "border-accent bg-accent text-on-accent" : "border-fg text-fg active:bg-surface"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <p aria-live="polite" className="text-sm text-fg-2 tabular-nums">
          {sessions} session{sessions === 1 ? "" : "s"} a week
          {days.map((d) => ` · ${d.name} ×${week.filter((c) => c === d.code).length}`).join("")}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run the checks.** `npx tsc --noEmit` and `npx eslint src` pass. Commit with Task 7.

---

### Task 5: Today screen and tab bar (checkpoint 1)

**Files:**
- Modify: `src/app/(app)/(tabs)/page.tsx` (full rewrite)
- Modify: `src/components/tab-bar.tsx` (full rewrite)
- Modify: `src/app/(app)/(tabs)/layout.tsx` (bottom padding)

**Interfaces:**
- Consumes: `BlockHeader` (Task 3); `DayCode`, `OutlineButton`, `SectionHead`, `WeightUpTag`, `PrimaryButton` with `tall` (Task 2); existing `findLastSets` and `suggest`.

- [ ] **Step 1: Rewrite `src/app/(app)/(tabs)/page.tsx`.**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BlockHeader } from "@/components/block/block-header";
import { useData } from "@/components/data-provider";
import { ChevronRightIcon } from "@/components/icons";
import { DayCode, GhostButton, Loading, OutlineButton, PrimaryButton, RunBadge, SectionHead, SessionBadge, WeightUpTag } from "@/components/ui";
import { activeDays, dayPrescriptions, formatWeekdays, scheduledDay, weekdaysOf } from "@/lib/program";
import { blockWeek, findLastSets, setsForWeek, shiftBlockStart, suggest } from "@/lib/progression";
import { findInProgress, isoWeekday, localIsoDate, runKmLast7Days } from "@/lib/today";
import type { ProgramDay } from "@/lib/types";
import { currentUserName } from "@/lib/user-cookie";
import { uuid } from "@/lib/uuid";

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const rowButton = "flex min-h-14 w-full items-center gap-3 border-b border-line py-2 text-left active:bg-surface";

export default function TodayPage() {
  const { program, log, ready, pending, apply } = useData();
  const router = useRouter();
  const [pickOtherDay, setPickOtherDay] = useState(false);
  const [customTitle, setCustomTitle] = useState<string | null>(null); // non-null while naming a custom workout

  if (!ready || !program) return <Loading />;

  const today = localIsoDate(new Date());
  const scheduled = scheduledDay(program, isoWeekday(today));
  const inProgress = findInProgress(log.sessions, today);
  const week = inProgress?.block_week ?? blockWeek(log.blockStartDate, today);
  const shownDay = program.days.find((d) => d.id === inProgress?.day_id) ?? scheduled;

  // Same suggestion as the workout screen, so a weight going up shows here first.
  const exercises = dayPrescriptions(program, shownDay?.id ?? null).map((p) => {
    const exercise = program.exercises.find((e) => e.id === p.exercise_id);
    const last = shownDay ? findLastSets(log.sessions, log.setLogs, shownDay.id, p.exercise_id) : [];
    const advanced = exercise !== undefined && suggest({ ...p, increment_kg: exercise.increment_kg }, week, last).advanced;
    return { ...p, name: exercise?.name ?? p.exercise_id, incrementKg: exercise?.increment_kg ?? 0, advanced };
  });

  function startSession(target: { day_id: string; title: null } | { day_id: null; title: string }) {
    apply([
      {
        kind: "upsert",
        table: "sessions",
        row: { id: uuid(), ...target, date: today, block_week: week, notes: null, completed_at: null },
      },
    ]);
    // Next keeps this page mounted; reset the picker for when we come back.
    setPickOtherDay(false);
    setCustomTitle(null);
    router.push("/session");
  }
  const start = (day: ProgramDay) => startSession({ day_id: day.id, title: null });
  const startCustom = (title: string) => startSession({ day_id: null, title: title.trim() });

  // Saved: shifts this user's block start so the app remembers the week from now on.
  const changeWeek = (delta: number) =>
    apply([{ kind: "set_block_start", date: shiftBlockStart(log.blockStartDate, today, Math.min(6, Math.max(1, week + delta))) }]);
  const setsLogged = inProgress ? log.setLogs.filter((s) => s.session_id === inProgress.id).length : 0;
  const showPicker = !inProgress && (!scheduled || pickOtherDay);

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 pt-3 pb-4">
      <header className="flex flex-col">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-medium text-fg-2">
            {formatDay(today)} · {currentUserName()}
          </p>
          <Link href="/program" className="type-label -mr-2 flex h-12 items-center px-2 text-[13px] text-fg">
            Program
          </Link>
        </div>
        <BlockHeader week={week} onChangeWeek={inProgress ? undefined : changeWeek} />
      </header>

      {inProgress?.day_id === null ? (
        <section>
          <SectionHead title={inProgress.title} meta="Custom · in progress" />
        </section>
      ) : shownDay ? (
        <section>
          <SectionHead
            title={
              <span className="flex items-center gap-2.5">
                <DayCode code={shownDay.code} />
                {shownDay.name}
              </span>
            }
            meta={`${formatWeekdays(weekdaysOf(program, shownDay.id))} · ${exercises.length} lifts`}
          />
          <ul>
            {exercises.map((e) => (
              <li key={e.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-line py-2">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="type-name text-[17px]">{e.name}</span>
                  {e.advanced && <WeightUpTag kg={e.incrementKg} />}
                </span>
                <span className="shrink-0 text-[15px] font-medium text-fg-2 tabular-nums">
                  {setsForWeek(e.base_sets, week)} × {e.rep_low}–{e.rep_high}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section>
          <SectionHead title="Rest day" />
          <p className="mt-2 text-fg-2">Nothing scheduled. Pick a day below to train anyway.</p>
        </section>
      )}

      <section aria-label="Running" className="flex items-center gap-3 border-y border-line py-3">
        <RunBadge />
        <p className="flex items-baseline gap-1.5">
          <span className="type-number text-[30px] text-run">{runKmLast7Days(log.runs, today)}</span>
          <span className="text-[15px] text-fg-2">km run · last 7 days</span>
        </p>
      </section>

      {pending > 0 && (
        <p className="text-sm text-fg-2">
          Saved on this phone · {pending} change{pending > 1 ? "s" : ""} waiting to sync
        </p>
      )}

      {/* Sticks above the tab bar (56px + 3px rule) so the main action stays in thumb reach on long days. */}
      <div className="sticky bottom-[calc(59px+env(safe-area-inset-bottom))] -mx-4 mt-auto flex flex-col gap-2 bg-bg px-4 pt-3">
        {inProgress ? (
          <PrimaryButton tall onClick={() => router.push("/session")} className="flex-col gap-0.5">
            Resume workout
            <span className="type-label text-[13px]">{inProgress.day_id === null ? inProgress.title : `${setsLogged} sets logged`}</span>
          </PrimaryButton>
        ) : customTitle !== null ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customTitle.trim()) startCustom(customTitle);
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="custom-title" className="type-label text-xs text-fg-2">
              Custom workout title
            </label>
            <input
              id="custom-title"
              autoFocus
              maxLength={80}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Arms, Hyrox class"
              className="h-14 border-2 border-line bg-bg px-4 text-lg outline-none placeholder:text-fg-3 focus:border-accent"
            />
            <PrimaryButton type="submit" disabled={!customTitle.trim()}>
              Start custom workout
            </PrimaryButton>
            <GhostButton type="button" onClick={() => setCustomTitle(null)}>
              Back
            </GhostButton>
          </form>
        ) : showPicker ? (
          <>
            <ul className="border-t-[3px] border-fg">
              {activeDays(program).map((d) => (
                <li key={d.id}>
                  <button onClick={() => start(d)} className={rowButton}>
                    <DayCode code={d.code} />
                    <span className="type-name flex-1 text-[17px]">{d.name}</span>
                    <ChevronRightIcon className="size-5 text-fg-2" />
                  </button>
                </li>
              ))}
              <li>
                <button onClick={() => setCustomTitle("")} className={rowButton}>
                  <SessionBadge dayCode={null} />
                  <span className="type-name flex-1 text-[17px]">Custom workout</span>
                  <ChevronRightIcon className="size-5 text-fg-2" />
                </button>
              </li>
            </ul>
            {scheduled && <GhostButton onClick={() => setPickOtherDay(false)}>Back</GhostButton>}
          </>
        ) : (
          scheduled && (
            <>
              <OutlineButton onClick={() => setPickOtherDay(true)}>Another day</OutlineButton>
              <PrimaryButton onClick={() => start(scheduled)}>Start {scheduled.name}</PrimaryButton>
            </>
          )
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/tab-bar.tsx`.**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, HistoryIcon, RunIcon } from "./icons";

const TABS = [
  { href: "/", label: "Today", Icon: CalendarIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/run", label: "Run", Icon: RunIcon },
];

/** Solid bar under a chalk rule; 56px + 3px high, plus the safe area. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 flex border-t-[3px] border-fg bg-bg pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`type-label relative flex h-14 flex-1 flex-col items-center justify-center gap-1 text-xs ${active ? "text-accent" : "text-fg-2"}`}
          >
            {active && <span aria-hidden className="absolute inset-x-6 -top-[3px] h-[3px] bg-accent" />}
            <Icon className="size-[22px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Update the bottom padding in `src/app/(app)/(tabs)/layout.tsx`.** Change `pb-[calc(4.5rem+env(safe-area-inset-bottom))]` to `pb-[calc(59px+env(safe-area-inset-bottom))]`.

- [ ] **Step 4: Run the checks.** `npm test`, `npx tsc --noEmit` and `npx eslint src`. Expected: all pass.

- [ ] **Step 5: Screenshots.** Use the −/+ buttons to move through the weeks, then capture:
  - Today in weeks 1, 4, 5 and 6;
  - a scheduled day, and a rest day with the picker open;
  - the "Resume workout" state;
  - one exercise showing `+2.5 KG`. To get it, log a session where every set reaches the top of the range, then reopen Today on the same day of the program.

  Check that the title row doesn't overflow at 390px in week 6 ("DELOAD" + "WEEK 6" + the two buttons). If it does, lower the hero to `text-[68px]` and note it in the spec.

- [ ] **Step 6: Commit after Anas's OK.**

```bash
git add src/components/block src/app/\(app\)/\(tabs\)/page.tsx src/app/\(app\)/\(tabs\)/layout.tsx src/components/tab-bar.tsx
git commit -m "feat(today): block barbell, week phases and weight-up tags"
```

---

### Task 6: `useOnline` hook

**Files:**
- Create: `src/lib/use-online.ts`

**Interfaces:**
- Produces: `useOnline(): boolean`, which is `true` on the server and before hydration.

- [ ] **Step 1: Create `src/lib/use-online.ts`.**

```ts
"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** True while the browser thinks it has a connection. Program changes need one; logging doesn't. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
```

- [ ] **Step 2: Run the checks.** `npx tsc --noEmit` and `npx eslint src` pass. This is a hook over browser events, so it has no unit test, like `use-wake-lock.ts`. Commit with Task 7.

---

### Task 7: Choosing a program: template picker, ChooseProgram, onboarding

**Files:**
- Create: `src/components/program/program-copy.ts`
- Modify: `src/components/program/template-picker.tsx` (full rewrite; the `exercises` prop is removed)
- Modify: `src/components/program/choose-program.tsx` (full rewrite)
- Modify: `src/app/(app)/onboarding/page.tsx` (styling only)

**Interfaces:**
- Consumes: `WeekStrip` and `WeekEditor` (Task 4), `useOnline` (Task 6), and `OfflineNotice`, `BackButton`, `OutlineButton` and `eyebrow` (Task 2).
- Produces:
  - `programBlurb(name: string): string | undefined`
  - `TemplatePicker({ templates, usedBefore, onPick })`

- [ ] **Step 1: Create `src/components/program/program-copy.ts`.**

```ts
// One plain sentence per program: what makes it different. Keyed by template name (UI copy, not data).
const BLURBS: Partial<Record<string, string>> = {
  "Full body": "Whole body every session. Best when your week is busy.",
  "Upper / Lower": "Upper body one day, legs the next. Each muscle twice a week.",
  "Bro split": "One muscle group per day, trained hard once a week.",
  "Push / Pull / Legs": "Pressing, pulling, legs, twice through. Most volume, most days.",
};

export const programBlurb = (name: string): string | undefined => BLURBS[name];
```

- [ ] **Step 2: Rewrite `src/components/program/template-picker.tsx`.**

```tsx
"use client";

import { weekFromSchedule } from "@/lib/program";
import type { Template } from "@/lib/types";
import { programBlurb } from "./program-copy";
import { WeekStrip } from "./week-strip";

/** One row per program: days a week first, then what makes it different and its default week. Fewest days first. */
export function TemplatePicker({
  templates,
  usedBefore,
  onPick,
}: {
  templates: Template[];
  /** Templates the user had before: their row shows the user's own version. */
  usedBefore: string[];
  onPick: (template: Template) => void;
}) {
  const sorted = [...templates].sort((a, b) => a.schedule.length - b.schedule.length);
  return (
    <ul className="flex flex-col">
      {sorted.map((t) => {
        const blurb = programBlurb(t.name);
        const days = t.schedule.length;
        return (
          <li key={t.id}>
            <button
              onClick={() => onPick(t)}
              aria-label={`${t.name}, ${days} days a week`}
              aria-describedby={blurb ? `blurb-${t.id}` : undefined}
              className="flex w-full flex-col gap-2 border-t-[3px] border-fg pt-2.5 pb-4 text-left active:bg-surface"
            >
              <span className="flex w-full items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="type-display block text-[30px]">{t.name}</span>
                  {usedBefore.includes(t.id) && <span className="type-label mt-1 block text-xs text-fg-2">Your version</span>}
                  {blurb && (
                    <span id={`blurb-${t.id}`} className="mt-1 block text-sm leading-snug text-fg-2">
                      {blurb}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-center">
                  <span className="type-display text-[44px] text-accent tabular-nums">{days}</span>
                  <span className="type-label text-xs text-fg-2">days</span>
                </span>
              </span>
              <WeekStrip week={weekFromSchedule(t.schedule, t.days)} days={t.days} size="sm" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: Rewrite `src/components/program/choose-program.tsx`.** The logic (`pick`, `save`, the template fetch) is unchanged.

```tsx
"use client";

import { useEffect, useState } from "react";
import { mondayOf, orderDays, planFromWeek, weekFromSchedule, yourVersion } from "@/lib/program";
import { RELOAD_FAILED, chooseProgram, failureMessage, fetchTemplates } from "@/lib/program-api";
import { localIsoDate } from "@/lib/today";
import type { Template, Week } from "@/lib/types";
import { useOnline } from "@/lib/use-online";
import { useData } from "../data-provider";
import { BackButton, GhostButton, Loading, OfflineNotice, OutlineButton, PrimaryButton, ScreenTitle, eyebrow } from "../ui";
import { TemplatePicker } from "./template-picker";
import { WeekEditor } from "./week-editor";

/**
 * Step 1: pick a template. Step 2: set the week (pre-filled with the template's default), then save.
 * Used on first login and to switch programs. History is never touched; the block restarts at week 1.
 */
export function ChooseProgram({ switching, onDone, onCancel }: { switching: boolean; onDone: () => void; onCancel?: () => void }) {
  const { program, refresh } = useData();
  const online = useOnline();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Template | null>(null);
  const [week, setWeek] = useState<Week>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchTemplates().then(
      (t) => live && setTemplates(t),
      (e) => live && setLoadError(failureMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  function pick(template: Template) {
    setPicked(template);
    setWeek(weekFromSchedule(template.schedule, template.days));
    setSaveError(null);
  }

  async function save() {
    if (!picked) return;
    setSaving(true);
    setSaveError(null);
    try {
      await chooseProgram(picked.id, planFromWeek(week), mondayOf(localIsoDate(new Date())));
      // The server restarted the block: a week change still queued from before must not undo that.
      if (!(await refresh({ dropBlockStart: true }))) throw new Error(RELOAD_FAILED);
      onDone();
    } catch (e) {
      setSaveError(failureMessage(e));
      setSaving(false);
    }
  }

  if (!picked) {
    return (
      <>
        <div>
          <p className={eyebrow}>Step 1 of 2</p>
          <ScreenTitle>{switching ? "Change program" : "Pick your split"}</ScreenTitle>
          <p className="mt-2 text-fg-2">How many days can you train? Start there.</p>
        </div>
        {loadError ? (
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-fg-2">
              {loadError}
            </p>
            <OutlineButton
              onClick={() => {
                setLoadError(null);
                setAttempt((a) => a + 1);
              }}
            >
              Try again
            </OutlineButton>
          </div>
        ) : templates === null || program === null ? (
          <Loading />
        ) : (
          <TemplatePicker
            // Re-picking the current program would only reset the week and the block: edit those on the program page.
            templates={templates.filter((t) => t.id !== program.active?.template_id).map((t) => yourVersion(program, t))}
            usedBefore={program.programs.map((p) => p.template_id).filter((id) => id !== null)}
            onPick={pick}
          />
        )}
        {onCancel && <GhostButton onClick={onCancel}>Cancel</GhostButton>}
      </>
    );
  }

  const trainingDays = planFromWeek(week).length;
  return (
    <>
      <BackButton onClick={() => setPicked(null)} disabled={saving}>
        Programs
      </BackButton>
      <div>
        <p className={eyebrow}>Step 2 of 2 · {picked.name}</p>
        <ScreenTitle>Your week</ScreenTitle>
      </div>
      {!online && <OfflineNotice />}
      <WeekEditor days={orderDays(picked.days, picked.schedule)} week={week} onChange={setWeek} />
      {switching && <p className="text-[15px] text-fg-2">Your history and weights stay. The 6-week block restarts at week 1.</p>}
      {saveError && (
        <p role="alert" className="text-[15px] text-danger">
          {saveError}
        </p>
      )}
      <div className="mt-auto flex flex-col gap-2">
        <PrimaryButton onClick={save} disabled={saving || trainingDays === 0 || !online}>
          {saving ? "Saving…" : switching ? `Switch to ${picked.name}` : "Start training"}
        </PrimaryButton>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Onboarding.** In `src/app/(app)/onboarding/page.tsx`, change the welcome line to `<p className="type-label text-xs text-fg-2">Welcome, {currentUserName()}</p>` and the `<main>` gap from `gap-4` to `gap-5`. Nothing else changes.

- [ ] **Step 5: Run the checks.** `npm test`, `npx tsc --noEmit` and `npx eslint src`. Expected: all pass. `tsc` catches any caller still passing `exercises` to `TemplatePicker`; ChooseProgram is the only one.

- [ ] **Step 6: Screenshots.** For a fresh user, either a new Google test account or a local user with the program rows deleted, capture:
  - onboarding step 1, scrolled to show all 4 programs;
  - step 2 for PPL after painting Sunday as Legs (the summary updates);
  - step 2 for the bro split, where the palette wraps onto 2 rows;
  - step 2 offline (DevTools → Network → Offline): the notice shows and Start training turns grey.

- [ ] **Step 7: Commit after Anas's OK.**

```bash
git add src/lib/use-online.ts src/components/program src/app/\(app\)/onboarding/page.tsx
git commit -m "feat(program): pick a split by days a week, paint your week"
```

---

### Task 8: Program page, day editor, exercise picker (checkpoint 2)

**Files:**
- Modify: `src/app/(app)/program/page.tsx` (full rewrite; adds the `{ kind: "week" }` view)
- Modify: `src/components/program/day-editor.tsx` (full rewrite)
- Modify: `src/components/program/exercise-picker.tsx` (full rewrite)

**Interfaces:**
- Consumes: `WeekStrip` and `WeekEditor` (Task 4), `useOnline` (Task 6), and from Task 2: `BackLink`, `BackButton`, `DayCode`, `SectionHead`, `OutlineButton` and `OfflineNotice`.

- [ ] **Step 1: Rewrite `src/app/(app)/program/page.tsx`.**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useData } from "@/components/data-provider";
import { ChevronRightIcon } from "@/components/icons";
import { ChooseProgram } from "@/components/program/choose-program";
import { DayEditor } from "@/components/program/day-editor";
import { WeekEditor } from "@/components/program/week-editor";
import { WeekStrip } from "@/components/program/week-strip";
import { BackButton, BackLink, DayCode, GhostButton, Loading, OfflineNotice, OutlineButton, PrimaryButton, ScreenTitle, SectionHead, eyebrow } from "@/components/ui";
import { activeDays, dayPrescriptions, formatWeekdays, planFromWeek, weekFromSchedule, weekdaysOf } from "@/lib/program";
import { RELOAD_FAILED, failureMessage, saveWeek } from "@/lib/program-api";
import { findInProgress, localIsoDate } from "@/lib/today";
import type { Week } from "@/lib/types";
import { useOnline } from "@/lib/use-online";

type View = { kind: "overview" } | { kind: "week" } | { kind: "day"; dayId: string } | { kind: "change" };

/** The user's program: their week, each day's exercises, and switching to another program. */
export default function ProgramPage() {
  const { program, log, ready, refresh } = useData();
  const router = useRouter();
  const online = useOnline();
  const [view, setView] = useState<View>({ kind: "overview" });
  // null until the week is edited; then the edited week, not yet saved.
  const [week, setWeek] = useState<Week | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready || !program?.active) return <Loading />;

  const days = activeDays(program);
  const savedWeek = weekFromSchedule(program.schedule, days);
  const shell = (children: ReactNode) => (
    <main className="flex flex-1 flex-col gap-5 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</main>
  );

  // Changing exercises mid-workout would reshuffle the session screen.
  if (findInProgress(log.sessions, localIsoDate(new Date()))) {
    return shell(
      <>
        <BackLink href="/">Today</BackLink>
        <ScreenTitle>{program.active.name}</ScreenTitle>
        <p className="text-fg-2">Finish your workout first, then come back to change your program.</p>
      </>,
    );
  }

  if (view.kind === "change") {
    return shell(<ChooseProgram switching onDone={() => router.replace("/")} onCancel={() => setView({ kind: "overview" })} />);
  }

  const editedDay = view.kind === "day" ? days.find((d) => d.id === view.dayId) : undefined;
  if (editedDay) return shell(<DayEditor program={program} day={editedDay} onClose={() => setView({ kind: "overview" })} />);

  const closeWeek = () => {
    setWeek(null);
    setError(null);
    setView({ kind: "overview" });
  };
  const saveEditedWeek = async () => {
    if (!week) return;
    setSaving(true);
    setError(null);
    try {
      await saveWeek(planFromWeek(week));
      if (!(await refresh())) throw new Error(RELOAD_FAILED);
      closeWeek();
    } catch (e) {
      setError(failureMessage(e));
    }
    setSaving(false);
  };

  if (view.kind === "week") {
    const shown = week ?? savedWeek;
    return shell(
      <>
        <BackButton onClick={closeWeek} disabled={saving}>
          Your program
        </BackButton>
        <div>
          <p className={eyebrow}>{program.active.name}</p>
          <ScreenTitle>Your week</ScreenTitle>
        </div>
        {!online && <OfflineNotice />}
        <WeekEditor days={days} week={shown} onChange={setWeek} />
        {error && (
          <p role="alert" className="text-[15px] text-danger">
            {error}
          </p>
        )}
        <div className="mt-auto flex flex-col gap-2">
          <PrimaryButton onClick={saveEditedWeek} disabled={!week || saving || planFromWeek(shown).length === 0 || !online}>
            {saving ? "Saving…" : "Save week"}
          </PrimaryButton>
          {week && (
            <GhostButton onClick={closeWeek} disabled={saving}>
              Discard changes
            </GhostButton>
          )}
        </div>
      </>,
    );
  }

  return shell(
    <>
      <BackLink href="/">Today</BackLink>
      <div>
        <p className={eyebrow}>Your program</p>
        <ScreenTitle>{program.active.name}</ScreenTitle>
      </div>
      {!online && <OfflineNotice />}

      <section className="flex flex-col gap-2">
        <SectionHead
          title="Week"
          meta={
            <button onClick={() => setView({ kind: "week" })} className="type-label -mr-2 h-12 px-2 text-sm text-accent">
              Edit week
            </button>
          }
        />
        <WeekStrip week={savedWeek} days={days} />
      </section>

      <section>
        <SectionHead title="Sessions" />
        <ul>
          {days.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => setView({ kind: "day", dayId: d.id })}
                className="flex min-h-[62px] w-full items-center gap-3 border-b border-line py-2 text-left active:bg-surface"
              >
                <DayCode code={d.code} />
                <span className="min-w-0 flex-1">
                  <span className="type-name block text-[18px]">{d.name}</span>
                  <span className="block text-[13px] text-fg-2">
                    {formatWeekdays(weekdaysOf(program, d.id))} · {dayPrescriptions(program, d.id).length} lifts
                  </span>
                </span>
                <ChevronRightIcon className="size-5 text-fg-2" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto flex flex-col gap-2">
        <p className="text-[13px] text-fg-2">Switching keeps your history and weights. The 6-week block restarts at week 1.</p>
        <OutlineButton onClick={() => setView({ kind: "change" })}>Change program</OutlineButton>
      </div>
    </>,
  );
}
```

- [ ] **Step 2: Rewrite `src/components/program/day-editor.tsx`.** The logic is unchanged; only the markup is new, plus the offline guard.

```tsx
"use client";

import { useState } from "react";
import { addExercise, dayPrescriptions, editableDay, removeExercise, swapExercise } from "@/lib/program";
import { RELOAD_FAILED, failureMessage, saveDayExercises } from "@/lib/program-api";
import type { Program, ProgramDay } from "@/lib/types";
import { useOnline } from "@/lib/use-online";
import { useData } from "../data-provider";
import { XIcon } from "../icons";
import { BackButton, DayCode, GhostButton, OfflineNotice, OutlineButton, PrimaryButton, ScreenTitle } from "../ui";
import { ExercisePicker } from "./exercise-picker";

/** Swap, add or remove a day's exercises. Sets and reps come from the slot (or 3 × 8–12 for an added one). */
export function DayEditor({ program, day, onClose }: { program: Program; day: ProgramDay; onClose: () => void }) {
  const { refresh } = useData();
  const online = useOnline();
  const [rows, setRows] = useState(() => editableDay(dayPrescriptions(program, day.id)));
  // null: the list; "add": picking an exercise to add; a number: picking the replacement for that row.
  const [picking, setPicking] = useState<"add" | number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const name = (id: string) => program.exercises.find((e) => e.id === id)?.name ?? id;
  const edit = (next: typeof rows) => {
    setRows(next);
    setDirty(true);
    setPicking(null);
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveDayExercises(day.id, rows);
      if (!(await refresh())) throw new Error(RELOAD_FAILED);
      onClose();
    } catch (e) {
      setError(failureMessage(e));
      setSaving(false);
    }
  }

  if (picking !== null) {
    return (
      <ExercisePicker
        exercises={program.exercises}
        exclude={rows.map((r) => r.exercise_id)}
        title={picking === "add" ? "Add an exercise" : `Replace ${name(rows[picking].exercise_id)}`}
        onPick={(id) => edit(picking === "add" ? addExercise(rows, id) : swapExercise(rows, picking, id))}
        onCancel={() => setPicking(null)}
      />
    );
  }

  return (
    <>
      <BackButton onClick={onClose} disabled={saving}>
        Your program
      </BackButton>
      <div className="flex items-center gap-3">
        <DayCode code={day.code} size="lg" />
        <ScreenTitle>{day.name}</ScreenTitle>
      </div>
      {!online && <OfflineNotice />}
      <ul className="border-t-[3px] border-fg">
        {rows.map((r, i) => (
          <li key={r.exercise_id} className="flex min-h-[62px] items-center gap-2 border-b border-line py-1.5">
            <span className="min-w-0 flex-1">
              <span className="type-name block text-[17px]">{name(r.exercise_id)}</span>
              <span className="block text-[13px] text-fg-2 tabular-nums">
                {r.base_sets} × {r.rep_low}–{r.rep_high}
                {r.note && ` · ${r.note}`}
              </span>
            </span>
            <OutlineButton onClick={() => setPicking(i)} aria-label={`Swap ${name(r.exercise_id)}`} className="px-3 text-sm">
              Swap
            </OutlineButton>
            <button
              aria-label={`Remove ${name(r.exercise_id)}`}
              onClick={() => edit(removeExercise(rows, i))}
              disabled={rows.length === 1}
              className="grid size-12 shrink-0 place-items-center text-fg-2 active:bg-surface disabled:opacity-30"
            >
              <XIcon className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => setPicking("add")}
        className="type-label flex h-14 items-center justify-center border-2 border-dashed border-fg-3 text-base text-fg active:bg-surface"
      >
        + Add exercise
      </button>
      <p className="text-[13px] text-fg-2">Past sessions keep what you did. A swapped-in lift you&apos;ve logged before keeps its weight.</p>
      {error && (
        <p role="alert" className="text-[15px] text-danger">
          {error}
        </p>
      )}
      <div className="mt-auto flex flex-col gap-2">
        <PrimaryButton onClick={save} disabled={!dirty || saving || !online}>
          {saving ? "Saving…" : `Save ${day.name}`}
        </PrimaryButton>
        {dirty && (
          <GhostButton onClick={onClose} disabled={saving}>
            Discard changes
          </GhostButton>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Rewrite `src/components/program/exercise-picker.tsx`.**

```tsx
"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/types";
import { GhostButton } from "../ui";

/** The shared catalog, searchable. Exercises already in the day are left out. */
export function ExercisePicker({
  exercises,
  exclude,
  title,
  onPick,
  onCancel,
}: {
  exercises: Exercise[];
  exclude: string[];
  title: string;
  onPick: (exerciseId: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = exercises.filter((e) => !exclude.includes(e.id) && e.name.toLowerCase().includes(q));
  return (
    <div className="flex flex-col gap-3">
      <h2 className="type-display text-[30px]">{title}</h2>
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
        className="h-14 border-2 border-line bg-bg px-4 text-lg outline-none placeholder:text-fg-3 focus:border-accent"
      />
      <ul className="border-t-[3px] border-fg">
        {matches.map((e) => (
          <li key={e.id}>
            <button onClick={() => onPick(e.id)} className="type-name flex min-h-14 w-full items-center border-b border-line text-left text-[17px] active:bg-surface">
              {e.name}
            </button>
          </li>
        ))}
        {matches.length === 0 && <li className="py-3 text-fg-2">Not in the catalog yet.</li>}
      </ul>
      <GhostButton onClick={onCancel}>Cancel</GhostButton>
    </div>
  );
}
```

- [ ] **Step 4: Run the checks.** `npm test`, `npx tsc --noEmit` and `npx eslint src`. Expected: all pass.

- [ ] **Step 5: Screenshots.** Capture:
  - the program page, online and offline;
  - Edit week after a change;
  - the day editor, before and after a swap;
  - the exercise picker with a search typed;
  - the "Finish your workout first" state;
  - Change program → step 1 → step 2.

  Also check that `/program` while offline still lets you browse every view.

- [ ] **Step 6: Commit after Anas's OK.**

```bash
git add src/app/\(app\)/program/page.tsx src/components/program/day-editor.tsx src/components/program/exercise-picker.tsx
git commit -m "feat(program): plate loaded program page, week view and day editor"
```

---

### Task 9: Workout screens

**Files:**
- Modify: `src/components/session/active-session.tsx` (imports, plus everything from `const lastLine` to the end of the file)
- Modify: `src/components/session/rest-timer.tsx` (full rewrite)
- Modify: `src/components/session/stepper.tsx` (classes only)
- Modify: `src/components/session/custom-session.tsx` (markup only)
- Modify: `src/app/(app)/session/page.tsx` (fallback markup)

**Interfaces:**
- Consumes: `blockPhase` (Task 1), `PHASE_LABEL` (Task 3), and from Task 2: `PhaseTag`, `WeightUpTag`, `BackLink`, `PrimaryButton` with `tall`, `eyebrow`, `type-number`.
- Produces: `RestTimer({ endsAt, totalSeconds, children? })`, where `children` is the undo slot.

- [ ] **Step 1: Rewrite `src/components/session/rest-timer.tsx`.**

```tsx
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
    <section aria-label="Rest timer" className={`relative overflow-hidden border-2 px-3 pt-1 pb-3 ${over ? "border-accent bg-accent text-on-accent" : "border-fg"}`}>
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
```

- [ ] **Step 2: Restyle `src/components/session/stepper.tsx`.**
  - In `StepButton`, replace the `className` with `"grid h-16 w-[72px] shrink-0 touch-manipulation place-items-center border-2 border-fg select-none active:bg-surface"`.
  - In `Stepper`, give the label span the class `"type-label mb-1 text-xs text-fg-2"`.
  - Replace `stepperValue` with `export const stepperValue = "type-number text-[46px]";`.
  - In `WeightField`, replace the placeholder classes with `placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:text-fg-3`.

- [ ] **Step 3: Update the imports in `active-session.tsx`.**
  - Change the existing progression import to `import { blockPhase, findLastSets, suggest } from "@/lib/progression";`.
  - Remove the `next/link` import.
  - Replace the `../icons` and `../ui` imports with:

```tsx
import { PHASE_LABEL } from "../block/phase-label";
import { ChevronLeftIcon, ChevronRightIcon, UndoIcon } from "../icons";
import { BackLink, GhostButton, PhaseTag, PrimaryButton, WeightUpTag, eyebrow } from "../ui";
```

- [ ] **Step 4: Rewrite the bottom of `active-session.tsx`.** Replace everything from `const lastLine = …` to the end of the file with:

```tsx
  const lastLine = formatSets(suggestion.lastSets, exercise.load_type);
  const firstTime = suggestion.weightKg === null && exercise.load_type !== "bodyweight";
  const suggestedLoad = formatLoad(suggestion.weightKg, exercise.load_type);
  const undoLoad = program.exercises.find((e) => e.id === undoable?.exercise_id)?.load_type ?? "machine";

  const undoButton = undoable && (
    <button onClick={undo} className="-mr-1 flex h-12 items-center gap-1.5 px-1 text-sm font-semibold text-current">
      <UndoIcon className="size-5" />
      Undo
      <span className="tabular-nums">
        {formatLoad(undoable.weight_kg, undoLoad)}×{undoable.reps}
      </span>
    </button>
  );

  return (
    <main
      className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      onTouchStart={(e) => (touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || (e.target instanceof HTMLElement && e.target.closest("button, input, a"))) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <header className="flex items-center justify-between gap-1">
        <BackLink href="/">Today</BackLink>
        <div className="flex items-center">
          <NavButton label="Previous exercise" disabled={index === 0} onClick={() => go(index - 1)}>
            <ChevronLeftIcon className="size-5" />
          </NavButton>
          <div className="flex gap-[3px]" aria-hidden>
            {items.map((it, i) => (
              <i
                key={it.exercise.id}
                className={`h-1.5 ${i === index ? "w-6 bg-accent" : it.logged.length >= it.suggestion.sets ? "w-3 bg-fg" : "w-3 bg-line"}`}
              />
            ))}
          </div>
          <NavButton label="Next exercise" disabled={isLast} onClick={() => go(index + 1)}>
            <ChevronRightIcon className="size-5" />
          </NavButton>
        </div>
        <button onClick={undoable ? finish : cancel} className="type-label -mr-2 h-12 px-2 text-sm text-fg">
          {undoable ? "Finish" : "Cancel"}
        </button>
      </header>

      <div>
        <p className={eyebrow}>
          Exercise {index + 1} of {items.length}
        </p>
        <h1 className="type-display mt-1 text-[52px]">{exercise.name}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-base font-bold">
          <PhaseTag>
            Wk {session.block_week} · {PHASE_LABEL[blockPhase(session.block_week)]}
          </PhaseTag>
          {suggestion.effortCue}
        </p>
        {rx.note && <p className="type-label mt-2 inline-block border border-line px-2 py-1 text-xs text-fg-2">{rx.note}</p>}
      </div>

      <div>
        <dl className="border-t-[3px] border-fg">
          <InfoRow label="Target">
            {suggestion.sets} × {rx.rep_low}–{rx.rep_high}
          </InfoRow>
          <InfoRow label="Last time">{lastLine}</InfoRow>
          <InfoRow label="Today">
            {firstTime ? (
              <span className="font-sans text-[15px] font-medium text-fg-2">First time: enter a working weight</span>
            ) : (
              <span className="flex items-center justify-end gap-2">
                {suggestion.advanced && <WeightUpTag kg={exercise.increment_kg} />}
                <span className="text-xl">
                  {suggestedLoad}
                  {suggestedLoad === "BW" ? "" : " kg"}
                </span>
              </span>
            )}
          </InfoRow>
        </dl>
        {suggestion.advanced && <p className="mt-1.5 text-[13px] text-fg-2">Every set hit {rx.rep_high} last time, so the weight goes up.</p>}
      </div>

      <section aria-label="Sets" className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: Math.max(suggestion.sets, logged.length) }, (_, i) => {
          const done = logged[i];
          const current = i === logged.length;
          return (
            <span
              key={i}
              className={`type-name flex h-[52px] items-center justify-center text-[15px] tabular-nums ${
                done ? "bg-fg text-bg" : current ? "border-[3px] border-accent text-accent" : "border border-fg-3 text-fg-3"
              }`}
            >
              {done ? `${formatLoad(done.weight_kg, exercise.load_type)}×${done.reps}` : `Set ${i + 1}`}
            </span>
          );
        })}
      </section>

      {restEndsAt !== null ? (
        <RestTimer endsAt={restEndsAt} totalSeconds={REST_SECONDS}>
          {undoButton}
        </RestTimer>
      ) : (
        undoButton && <div className="flex justify-end text-fg-2">{undoButton}</div>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <section aria-label="Next set" className="flex flex-col gap-2.5">
          {exercise.load_type !== "bodyweight" && (
            <Stepper
              label={isBodyweight(exercise.load_type) ? "Added kg" : "kg"}
              onStep={(dir) => setDraft({ ...draft, weightKg: stepWeight(draft.weightKg, dir * WEIGHT_STEP_KG) })}
              fineStep={(dir) => setDraft({ ...draft, weightKg: stepWeight(draft.weightKg, dir * WEIGHT_FINE_STEP_KG) })}
            >
              <WeightField
                value={draft.weightKg}
                onChange={(kg) => setDraft({ ...draft, weightKg: kg })}
                placeholder={exercise.load_type === "bodyweight_plus" ? "0 = bodyweight" : "First weight"}
              />
            </Stepper>
          )}
          <Stepper label="reps" onStep={(dir) => setDraft({ ...draft, reps: stepReps(draft.reps, dir) })}>
            <span className={stepperValue}>{draft.reps}</span>
          </Stepper>
        </section>

        <PrimaryButton tall onClick={onPrimary}>
          {primaryLabel}
        </PrimaryButton>
        {prescribedDone && <GhostButton onClick={logSet}>Add set {logged.length + 1}</GhostButton>}
      </div>
    </main>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-line py-2">
      <dt className="shrink-0 text-[15px] text-fg-2">{label}</dt>
      <dd className="type-name text-right text-[17px] tabular-nums">{children}</dd>
    </div>
  );
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} disabled={disabled} onClick={onClick} className="grid size-12 place-items-center text-fg disabled:opacity-20">
      {children}
    </button>
  );
}
```

  The old `suggestedLine` const is removed: the "Today" row replaces it. Check that nothing else references it. The same goes for the old `card` import.

- [ ] **Step 5: Restyle `custom-session.tsx`.**
  - Replace the header `Link` with `<BackLink href="/">Today</BackLink>`.
  - Make the Cancel `GhostButton` `<button onClick={cancel} className="type-label -mr-2 h-12 px-2 text-sm text-fg">Cancel</button>`.
  - Make the `h1` `className="type-display text-[52px]"`.
  - Make the notes label `className="type-label text-xs text-fg-2"`.
  - Give the textarea `className="w-full border-2 border-line bg-bg p-4 text-lg outline-none placeholder:text-fg-3 focus:border-accent"`.
  - Make Finish `<PrimaryButton tall onClick={finish} className="mt-auto">Finish</PrimaryButton>`.
  - Update the imports: `BackLink` and `PrimaryButton` from `../ui`, and remove `Link`, `ChevronLeftIcon`, `GhostButton` and `card`.

- [ ] **Step 6: Restyle the session page fallback.** In `src/app/(app)/session/page.tsx`, make the "No session in progress." text `className="type-display text-[30px]"` and the link `className="type-label flex h-12 items-center text-sm text-accent"`.

- [ ] **Step 7: Run the checks.** `npm test`, `npx tsc --noEmit` and `npx eslint src`. Expected: all pass.

- [ ] **Step 8: Screenshots.** Capture:
  - the first set of a weighted exercise;
  - resting, with the timer running and Undo in the band;
  - the rest timer when rest is over;
  - an exercise with `+2.5 KG`;
  - a bodyweight exercise;
  - a first-time exercise with no weight;
  - week 6 (two sets, no tag);
  - a custom workout.

  Check that the header fits at 390px with 7 exercises.

- [ ] **Step 9: Commit after Anas's OK.**

```bash
git add src/components/session src/app/\(app\)/session/page.tsx
git commit -m "feat(session): plate loaded workout, phase tag and rest band"
```

---

### Task 10: History and Run

**Files:**
- Modify: `src/app/(app)/(tabs)/history/page.tsx` (markup only)
- Modify: `src/app/(app)/(tabs)/run/page.tsx` (markup only)

- [ ] **Step 1: Restyle History.** The logic, `historyItems`, the toggles and the arm-to-delete behaviour don't change. Class by class:
  - `<ul className="flex flex-col gap-2.5">` becomes `<ul className="border-t-[3px] border-fg">`.
  - Both `<li className={card}>` become `<li className="border-b border-line">`.
  - Both row buttons: `className="flex min-h-16 w-full items-center gap-3 py-3 text-left active:bg-surface"`.
  - Row titles: `className="type-name block text-[17px] tabular-nums"`. Row meta: `className="mt-0.5 block text-[13px] text-fg-2"`.
  - The expanded areas (`div` and `dl`): `className="flex flex-col gap-2.5 pb-4 pl-[46px]"`. 46px is the 34px badge plus the 12px gap.
  - `<dt>`: `className="text-[13px] text-fg-2"`. `<dd>`: `className="type-name mt-0.5 text-[15px] tabular-nums"`.
  - Chevron: `text-fg-2` instead of `text-fg-3`; keep `transition-transform`, prefixed `motion-safe:`.
  - `DeleteButton`: `className={`type-label mt-1 h-12 text-sm ${armed ? "bg-danger text-bg" : "border-2 border-danger text-danger active:bg-surface"}`}`.
  - The empty state: `<p className="text-fg-2">Your workouts and runs show up here.</p>`.
  - Remove `card` from the imports.

- [ ] **Step 2: Restyle Run.** Class by class:
  - `inputClass` becomes `"h-14 w-full border-2 border-line bg-bg px-4 text-lg tabular-nums outline-none placeholder:text-fg-3 focus:border-accent"`.
  - The pace block becomes:

    ```tsx
    <p className="flex items-baseline justify-between border-y border-line py-3">
      <span className="type-label text-xs text-fg-2">Pace</span>
      <span className="type-number text-[46px]">{preview ? formatPace(preview.distance_km, preview.duration_sec) : "—"}</span>
    </p>
    ```

  - Both labels in `Field`: `className="type-label text-xs text-fg-2"`.
  - `Choice`: `className={`type-label h-12 text-sm ${selected ? "bg-run text-bg" : "border-2 border-line text-fg-2 active:bg-surface"}`}`.
  - The duration separator `:`: `text-fg-2`.
  - Remove `card` from the imports.

- [ ] **Step 3: Run the checks.** `npm test`, `npx tsc --noEmit` and `npx eslint src`. Expected: all pass.

- [ ] **Step 4: Screenshots.** Capture History with a run and a session (one of them expanded and armed for delete), and Run, empty and filled in.

- [ ] **Step 5: Commit after Anas's OK.**

```bash
git add src/app/\(app\)/\(tabs\)/history/page.tsx src/app/\(app\)/\(tabs\)/run/page.tsx
git commit -m "feat(history,run): plate loaded rows and fields"
```

---

### Task 11: Login and cleanup

**Files:**
- Modify: `src/app/login/page.tsx` (markup only)
- Modify: `src/components/ui.tsx` (remove `card` and `DayBadge`)
- Modify: `src/app/globals.css` (remove the legacy tokens)

- [ ] **Step 1: Restyle login.**
  - Remove `rounded-2xl` from the `img`.
  - Make the `h1` `<h1 className="type-display mt-5 text-[52px]">Training Tracker</h1>`.
  - Make the Google link `className="type-display flex min-h-16 touch-manipulation items-center justify-center bg-accent px-4 text-[28px] text-on-accent active:bg-accent-press"`.
  - Change the error text to "Sign-in failed. Try again."

- [ ] **Step 2: Check that the legacy code is unused.** Run:

```bash
grep -rnE "\bcard\b|DayBadge|surface-2|accent-soft|accent-dim|run-soft|rounded-|backdrop-blur|font-extrabold" src --include=*.tsx --include=*.ts
```

  Expected: no matches, except `card` appearing in comments or in its own definition. Fix every match in a screen before going on.

- [ ] **Step 3: Remove the legacy code.**
  - In `ui.tsx`, delete the `card` export and the `DayBadge` alias.
  - In `globals.css`, delete the four legacy colour tokens and their comment.

- [ ] **Step 4: Run the checks.** `npm test`, `npx tsc --noEmit`, `npx eslint src` and `npm run build`. The build checks that the font loads and that the PWA still builds.

- [ ] **Step 5: Offline smoke test.**
  1. Run `npm run build && npm start` and open the app once online.
  2. Go offline in DevTools.
  3. Reload: Today renders, with Archivo.
  4. Start a workout, log a set: it shows "waiting to sync".
  5. Open `/program`: the offline notice shows and Save is grey.
  6. Go back online: the pending count goes to 0.

- [ ] **Step 6: Screenshots and commit after Anas's OK.** Capture the login screen.

```bash
git add src/app/login/page.tsx src/components/ui.tsx src/app/globals.css
git commit -m "chore(ui): drop legacy card styles and tokens"
```

---

## Spec coverage check

| Spec section | Task |
|---|---|
| Tokens, type, Archivo | 2 |
| Components | 2 (primitives), 4 (WeekStrip), 3 (BlockBar) |
| `blockPhase` with a test | 1 |
| BlockBar, BlockHeader, next-week flag, −/+ correction | 3, 5 |
| Weight-up tag on Today and in the workout, with its reason | 5, 9 |
| Template picker with days, sentence and strip | 7 |
| ChooseProgram in 2 steps, WeekPainter | 4, 7 |
| Program page with its week view, day editor, exercise picker | 8 |
| Offline (`useOnline`, notice, disabled saves) | 6, 7, 8 |
| Today | 5 |
| Workout, rest band, steppers, custom session | 9 |
| History, Run | 10 |
| Tab bar | 5 |
| Login | 11 |
| Motion only under `motion-safe:` | 3, 4, 9, 10 |
| Verification per screen | Every task |
