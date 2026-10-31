// The logged-in user's id, readable by the page (unlike the httpOnly auth cookie).
// Not a proof of identity, the server never trusts it: it only picks which
// offline cache (IndexedDB) to open before any network call.

export const USER_COOKIE = "tt_user";

export function currentUserId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${USER_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
