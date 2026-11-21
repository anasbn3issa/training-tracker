import type { DayExercise, Template, WeekPlan } from "./types";

// Program changes are rare and made online: they go straight to the server, not through the sync outbox.

async function send(url: string, method: "POST" | "PUT", body: unknown): Promise<void> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(res.status >= 500 ? "Server error, try again." : "That change was refused.");
}

export async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch("/api/templates", { cache: "no-store" });
  if (!res.ok) throw new Error("Couldn't load the programs.");
  return res.json();
}

export const chooseProgram = (templateId: string, week: WeekPlan, blockStart: string) =>
  send("/api/program/choose", "POST", { templateId, week, blockStart });

export const saveWeek = (week: WeekPlan) => send("/api/program/schedule", "PUT", { week });

export const saveDayExercises = (dayId: string, exercises: DayExercise[]) => send(`/api/program/days/${dayId}`, "PUT", { exercises });

/** Thrown when a change was saved but the app couldn't load it back: saving again is harmless. */
export const RELOAD_FAILED = "Saved, but the app couldn't reload your program. Try again.";

/** Message for a failed change: offline is the usual cause on a phone. */
export const failureMessage = (e: unknown) =>
  typeof navigator !== "undefined" && !navigator.onLine ? "You're offline. Program changes need a connection." : e instanceof Error ? e.message : "Something went wrong.";
