import { NextResponse, type NextRequest } from "next/server";
import { resolveAccount } from "@/lib/accounts";
import { isActiveUser, supabaseAccounts } from "@/lib/accounts-db";
import { AUTH_COOKIE, AUTH_MAX_AGE_SEC, NAME_COOKIE, USER_COOKIE, authEnv, authToken, safeEqual } from "@/lib/auth";
import { OAUTH_COOKIE, fetchProfile, googleEnv, parseOAuthCookie } from "@/lib/google";
import { db } from "@/lib/supabase";

/** Step 2 of Google sign-in: Google sends the browser back here with a one-time code. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const failed = () => {
    const response = NextResponse.redirect(new URL("/login?error=1", url.origin));
    response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
    return response;
  };

  // The state must be the one we just put in this browser's cookie: proves the
  // sign-in was started here, not by a link someone else crafted.
  const attempt = parseOAuthCookie(request.cookies.get(OAUTH_COOKIE)?.value);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!attempt || !code || !state || !safeEqual(state, attempt.state)) return failed();

  const profile = await fetchProfile({
    env: googleEnv(),
    code,
    verifier: attempt.verifier,
    redirectUri: new URL("/api/auth/callback", url.origin).toString(),
  });
  if (!profile) return failed();

  const supabase = db();
  const account = await resolveAccount(supabaseAccounts(supabase), profile, () => crypto.randomUUID()).catch(() => null);
  if (!account) return failed();
  // A blocked account gets no cookie at all (see users.disabled_at).
  if (!(await isActiveUser(supabase, account.id).catch(() => false))) return failed();

  const options: { sameSite: "lax"; secure: boolean; maxAge: number; path: string } = {
    sameSite: "lax",
    // Only over HTTPS in production; plain http on localhost still works.
    secure: url.protocol === "https:",
    maxAge: AUTH_MAX_AGE_SEC,
    path: "/",
  };
  const response = NextResponse.redirect(new URL("/", url.origin));
  response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
  response.cookies.set(AUTH_COOKIE, authToken(account.id, authEnv()), { ...options, httpOnly: true });
  response.cookies.set(USER_COOKIE, account.id, options);
  response.cookies.set(NAME_COOKIE, account.name, options);
  return response;
}
