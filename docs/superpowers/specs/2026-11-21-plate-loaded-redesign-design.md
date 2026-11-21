# Plate loaded: UI redesign

Date: 2026-11-21 · Branch: `redesign/plate-loaded` · Mockups: [`docs/design/directions.html`](../../design/directions.html) (option A), [`docs/design/program-screens.html`](../../design/program-screens.html)

## Goal

Give the app a look a 16–25 year old lifter would screenshot, make the 6-week block readable at a glance, and make the program screens easier. This is a UI redesign: logic, routes, API contracts, offline sync and the PWA stay as they are.

## Direction

Gym hardware and stencil signs. Warm black, chalk white, one safety-orange accent. Square corners. Hierarchy comes from type size, width and thick rules, not from cards. Signature: **the block drawn as a loaded barbell**, where plate size is how hard the week is.

What we don't do: rounded cards, cards inside cards, gradients, glass or blur, emoji, motivational copy, everything at the same weight.

## Tokens

`src/app/globals.css`, `@theme`. Same token names as today where possible, so existing classes keep working during the migration.

| Token | Value | Use |
|---|---|---|
| `bg` | `#0d0d0b` | Page. Also `themeColor` and the manifest colours |
| `surface` | `#181815` | Pressed rows, disabled primary button |
| `line` | `#2a2925` | Hairline between rows |
| `fg` | `#f1eee6` | Text, thick rules (3px), outlined buttons, day-code tiles |
| `fg-2` | `#a9a59a` | Secondary text (8:1 on `bg`) |
| `fg-3` | `#6f6b62` | Disabled and decorative only, never text you need to read |
| `accent` | `#ff5a1f` | Now and action: the main button, the current week, a weight increase |
| `accent-press` | `#ff7440` | Pressed main button |
| `on-accent` | `#160700` | Text on accent |
| `run` | `#4c8dff` | Runs only |
| `danger` | `#ff4d4d` | Delete, errors |

`surface-2`, `accent-soft` and `accent-dim` are removed once no screen uses them. Corner radius is 0 everywhere.

Accent rule: one orange thing that matters per screen region. Day codes are chalk, not orange, so orange keeps meaning "now", "do this" or "it went up".

## Type

One family, **Archivo** (variable, `wght` 400–900 and `wdth` 62–125), through `next/font/google` with `axes: ["wdth"]`. It replaces Inter and is self-hosted at build time, so it works offline.

Three `@utility` classes in `globals.css` carry the type styles:

- `type-display`: `wdth` 62%, weight 900, uppercase, line-height 0.92
- `type-label`: `wdth` 80%, weight 800, uppercase, tracking 0.06em (eyebrows, buttons, tags)
- `type-name`: `wdth` 80%, weight 700 (exercise and session names in rows)

| Role | Size | Style |
|---|---|---|
| Hero (week title, Deload) | 76px | `type-display` |
| Screen title | 52px | `type-display` |
| Section heading, main button | 26–30px | `type-display` |
| Effort cue | 21px | weight 700, line-height 1.2 |
| Row name | 17px | `type-name` |
| Body | 15px | weight 400–500 |
| Meta, eyebrow | 13px (12px eyebrow) | `fg-2`; eyebrow uses `type-label` |
| Stepper value, timer | 46–54px | `wdth` 80%, weight 900, `tabular-nums` |

Nothing smaller than 12px. All numbers use `tabular-nums`.

## Components

`src/components/ui.tsx` is rewritten. The `card` export is removed at the end, once no screen uses it.

- **PrimaryButton**: accent fill, `type-display` 28px, height 64px (72px in the workout), full width. Disabled: `surface` fill and `fg-3` text.
- **OutlineButton** (new): 2px `fg` border, `type-label` 16px, height 52px. For secondary actions such as Change program, Another day and Back.
- **GhostButton**: text only, height 48px, for the least important actions.
- **IconButton**: 48px square, 2px `fg` border.
- **DayCode** (replaces `DayBadge`): chalk square with dark `type-display` text (Pu, A, U). Sizes 34px and 48px.
- **SessionBadge, RunBadge**: same shape. Custom workouts show a dumbbell on chalk. Runs show the run icon on `run`.
- **SectionHead** (new): 3px `fg` top rule, `type-display` 26px title, optional `fg-2` meta on the right.
- **Rows**: lists are rows split by `line` hairlines, never boxed.
- **WeightUpTag** (new): solid accent, `type-label` 12px, for example `+2.5 KG`.
- **PhaseTag** (new): 2px accent outline, accent `type-label` text, for example `WK 5 · PEAK`.
- **OfflineNotice** (new): 2px `fg` border, "You're offline. Program changes need a connection."
- **WeekStrip** (new): 7 read-only cells, Monday to Sunday. Training days are chalk cells with the day code; rest days are dashed cells with a dash. Used in the template picker and on the program page.

Touch targets are at least 48px everywhere. Rows that open something are buttons along their whole height. Nothing depends on hover.

## The 6-week block

### Phases

A new pure helper in `src/lib/progression.ts`, with tests in `progression.test.ts`:

```ts
export type BlockPhase = "ramp" | "build" | "peak" | "deload";
export function blockPhase(week: number): BlockPhase; // 1–2 ramp, 3–4 build, 5 peak, 6 deload
```

The labels shown are Ramp, Build, Peak and Deload. The effort cue still comes from `effortCue(week)`; its wording doesn't change.

### BlockBar

`src/components/block/block-bar.tsx`. An SVG barbell carrying 6 plates, with W1–W5 and DL under them. Each plate's height comes from its phase: ramp 48, build 72, peak 100, deload 30 (in a viewBox 138 high).

| State | Plates |
|---|---|
| Weeks 1–5 | Past weeks are filled `fg-3`. The current week is filled `accent`. Future weeks are outlined in `fg`, and the deload plate is dashed. |
| Week 6 | Plates 1–5 are dashed outlines ("plates off"). The deload plate is filled `accent`. |

It has `role="img"` and an `aria-label` such as "Week 5 of 6, peak". The fill colour change animates only under `motion-safe:`.

### BlockHeader on Today

`src/components/block/block-header.tsx`, from top to bottom:

1. The BlockBar.
2. The title, `WEEK 5` at 76px plus the phase in accent (`PEAK`). In week 6 it reads `DELOAD` plus `WEEK 6`.
3. The effort cue at 21px.
4. A next-week flag (outlined `type-label`), only when there's something to know:
   - week 4: "Peak week next, then deload"
   - week 5: "Next week: deload"
   - week 6: "Block restarts at week 1 next week"
5. The two existing 48px IconButtons (− and +) that correct the week, on the title row. They are hidden during a workout, as they are today.

### Weight increases

When `suggest(...).advanced` is true:

- **Today**: the exercise row shows a WeightUpTag `+{increment} KG`. Today already loads the program and the log, so it computes the suggestion with the existing `findLastSets` and `suggest`.
- **Workout**: the "Today" row shows the WeightUpTag and the new weight. Under it, one line gives the reason: "Every set hit {rep_high} last time, so the weight goes up."

`suggest` already never sets `advanced` in week 6, so a deload week never shows a tag.

## Screens

### Program screens (do these first)

- **Template picker**:
  - Each program is one row under a 3px rule: its name at 30px `type-display`, its days per week in large accent text, one plain sentence, and a WeekStrip of its default week.
  - Rows are sorted by days per week, fewest first.
  - The intro line is "How many days can you train? Start there."
  - Programs the user had before show a "Your version" label.
  - The sentences live in `src/components/program/program-copy.ts`, keyed by template name. An unknown name shows no sentence.
- **ChooseProgram**: two steps, each with a `Step N of 2` eyebrow. Step 1 is the template picker, step 2 is the week painter. Switching program keeps today's note: "Your history stays. The 6-week block restarts at week 1."
- **WeekPainter** (replaces the inside of `WeekEditor`; its props `{ days, week, onChange }` don't change):
  - Seven rows of 54px, Monday to Sunday. Each row is a button showing the weekday and the session's DayCode and full name, or "Rest".
  - A palette sits at the bottom, in thumb reach: a `radiogroup` with one 52px choice per program day plus Rest. It starts on the first day of the program.
  - Tapping a row gives it the chosen session.
  - A live summary underneath reads, for example, "6 sessions a week · Push ×2 · Pull ×2 · Legs ×2", in an `aria-live="polite"` region.
  - Each row's `aria-label` reads "Monday, Push", and a shared hint reads "Tap a day to set it to Legs".
- **Program page**:
  - The program name, then a Week section with a WeekStrip and an "Edit week" button.
  - Then a Sessions section, one row per day: its DayCode, name, weekdays and number of lifts.
  - At the bottom, an OutlineButton "Change program" with the note on history.
  - Editing the week becomes its own view, `{ kind: "week" }`, with Save and Cancel. It is no longer inline. The route doesn't change.
- **Day editor**:
  - Rows with the exercise name and its sets × reps, a 48px Swap OutlineButton and a 48px Remove IconButton.
  - "+ Add exercise" is a full-width dashed row.
  - A PrimaryButton "Save {day name}" stays at the bottom and is disabled until something changes.
- **Exercise picker**: a square search field with a 2px border that turns accent on focus. Each result is a 56px row.
- **Onboarding**: the eyebrow "Welcome, {name}", then ChooseProgram.

### Offline

New hook `src/lib/use-online.ts`: `useSyncExternalStore` over `navigator.onLine` and the `online` and `offline` events. The server snapshot is `true`.

While offline:

- The program page, ChooseProgram and the day editor show OfflineNotice.
- The buttons that save changes are `disabled`, and the notice explains why.
- Browsing stays possible.

`failureMessage` stays as the fallback when a save fails.

### Today

From top to bottom:

1. The date, and a "Program" link (48px, `type-label`).
2. The BlockHeader.
3. A SectionHead with today's session (for example "PUSH", with "Mon · Thu · 6 lifts" on the right).
4. Exercise rows showing sets for this week × reps, plus WeightUpTags.
5. A run row: RunBadge, km in the last 7 days, in `run` blue.
6. The pending-sync line.
7. The sticky main action: "Start {day name}", with "Another day" as an OutlineButton.

The other-day picker and the custom-workout form use rows and DayCode tiles, not cards.

### Workout (`src/components/session/*`)

- **Header**: back link, an exercise progress bar of segments (the current one wider and accent), and Finish or Cancel.
- **Exercise**:
  - An eyebrow "Exercise 2 of 6", then the name at 52px `type-display`.
  - A PhaseTag and the effort cue.
  - Rows for Target, Last time and Today, with the reason line under Today.
- **Set slots**: logged sets are chalk fills, the current set has a 3px accent outline, and later sets have a `fg-3` hairline.
- **Rest timer**: a band with a 2px `fg` border, a "REST" label, the time at 54px, and a 6px accent bar along the bottom (its width transition is `motion-safe:` only). Undo sits inside the band. When rest is over, the band turns chalk (`fg` fill, `bg` text), so it doesn't compete with the orange main button just below it.
- **Steppers**: 72 × 64px outlined − and + buttons around a 46px value.
- **Main button**: 72px.
- **Custom session**: the same language.

### History, Run, tab bar, login

- **History**:
  - Rows split by hairlines, each with its DayCode or RunBadge, a bold name and the meta.
  - The expanded details are indented under the name.
  - The delete button is outlined in danger, and fills with danger once armed.
- **Run**:
  - Square fields with 2px borders.
  - The choice buttons fill with `run` when selected.
  - The pace is shown at 46px.
- **Tab bar**:
  - A solid `bg` background with no blur, under a 3px `fg` top rule.
  - The labels use `type-label` at 12px.
  - The active tab is in accent, with a 3px accent bar at its top.
  - It is 56px high, plus the safe area.
- **Login**: the same tokens and buttons.

## Copy

Plain and short, numbers first. No exclamation marks, no emoji, no hype. Uppercase only through `type-display` and `type-label`. Names are kept: "Start push", "Edit week", "Change program".

## Motion

Only three animations: the plate colour on BlockBar, a 300ms accent flash on a painted week row, and the rest bar's width. All of them use `motion-safe:`.

## Verification per screen

- `npm test`, `npx tsc --noEmit` and `npx eslint src` pass.
- Screenshots at 390px wide go to Anas.
- In addition, for the block display and the workout: check week 1, week 5 and week 6, an advanced exercise, and the offline state of the program screens.

## Out of scope

- A light theme, new routes, API or database changes, and template descriptions stored in the database.
- Share images.
- Any change to the logic in `src/lib` other than `blockPhase` and `use-online`.
