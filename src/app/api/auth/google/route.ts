import { NextResponse, type NextRequest } from "next/server";
import { OAUTH_COOKIE, OAUTH_MAX_AGE_SEC, authorizeUrl, googleEnv, newOAuthAttempt, oauthCookieValue } from "@/lib/google";

/** Step 1 of Google sign-in: remember a random state + PKCE verifier, then send the browser to Google. */
export function GET(request: NextRequest) {
  const { state, verifier, challenge } = newOAuthAttempt();
  const redirectUri = new URL("/api/auth/callback", request.nextUrl.origin).toString();

  const response = NextResponse.redirect(authorizeUrl({ clientId: googleEnv().clientId, redirectUri, state, challenge }));
  response.cookies.set(OAUTH_COOKIE, oauthCookieValue(state, verifier), {
    httpOnly: true,
    // "lax" is still sent when Google redirects the browser back to us (a top-level GET).
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    maxAge: OAUTH_MAX_AGE_SEC,
    path: "/api/auth",
  });
  return response;
}
