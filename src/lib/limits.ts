// Limits shared by the API (which rejects anything above them) and the forms (which stop typing at them),
// so a phone never queues a change the server would refuse and drop.

/** Longest note on a session or a run. */
export const NOTES_MAX = 2000;

/** Most ops in one /api/sync request. The phone sends batches of this size (BATCH in sync.ts). */
export const SYNC_BATCH_MAX = 100;
