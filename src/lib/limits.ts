// Limits shared by the API and the forms. The forms stop typing at them; the API trims notes and refuses
// the rest, so a phone never queues a change the server would refuse and drop.

/** Longest note on a session or a run. */
export const NOTES_MAX = 2000;

/** Most ops in one /api/sync request. The phone sends batches of this size (BATCH in sync.ts). */
export const SYNC_BATCH_MAX = 100;

/** Most ops one user may sync per day (see use_sync_budget). A real day is ~50, a week offline ~350. */
export const SYNC_DAILY_OPS_MAX = 2000;
