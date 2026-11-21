import { z } from "zod";

// Request body pieces shared by the API routes.

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Program routes name days by code: it is stable when a template is copied.
export const weekPlan = z
  .array(z.object({ weekday: z.int().min(1).max(7), code: z.string().min(1).max(4) }))
  .max(7)
  .refine((plan) => new Set(plan.map((e) => e.weekday)).size === plan.length, "a weekday appears twice");

/** A day's exercises, in order. Sets/reps travel with the row: the app keeps them when swapping. */
export const dayExercises = z
  .array(
    z
      .object({
        exercise_id: z.string().min(1),
        base_sets: z.int().min(1).max(10),
        rep_low: z.int().min(1).max(100),
        rep_high: z.int().min(1).max(100),
        note: z.string().max(200).nullable(),
      })
      .refine((r) => r.rep_high >= r.rep_low, "rep_high below rep_low"),
  )
  .min(1)
  .max(15)
  .refine((rows) => new Set(rows.map((r) => r.exercise_id)).size === rows.length, "an exercise appears twice");
