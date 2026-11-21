// Account changes go straight to the server, like program changes (they can't wait in the sync outbox).

/** Set just before leaving for /login after a deletion: the login page then clears that user's offline cache. */
export const CLEAR_CACHE_KEY = "tt_clear_cache";

/** Deletes the account and all its data on the server. Throws a message for the screen. */
export async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/account", { method: "DELETE" });
  if (res.status === 401) throw new Error("You're signed out. Sign in again, then delete your account.");
  if (!res.ok) throw new Error("Couldn't delete your account. Try again.");
}
