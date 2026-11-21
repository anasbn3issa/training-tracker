// The logged-in user's id and display name, readable by the page (unlike the httpOnly
// auth cookie). Not a proof of identity, the server never trusts them: the id only
// picks which offline cache (IndexedDB) to open before any network call.

export const USER_COOKIE = "tt_user";
export const NAME_COOKIE = "tt_name";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const currentUserId = () => readCookie(USER_COOKIE);
export const currentUserName = () => readCookie(NAME_COOKIE);
