import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

// Google sign-in (OpenID Connect, authorization code flow + PKCE).
// 1. /api/auth/google sends the browser to Google with a random `state` and a PKCE challenge.
// 2. Google sends it back to /api/auth/callback with a one-time `code`.
// 3. The callback trades the code (+ the PKCE verifier + our client secret) for an id_token,
//    a JWT describing the Google account.

export const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** Holds `state` and the PKCE verifier between the redirect to Google and the callback. */
export const OAUTH_COOKIE = "tt_oauth";
export const OAUTH_MAX_AGE_SEC = 10 * 60;

export type GoogleEnv = { clientId: string; clientSecret: string };

export function googleEnv(): GoogleEnv {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  return { clientId, clientSecret };
}

const random = () => randomBytes(32).toString("base64url");

/** A fresh `state` and PKCE verifier, plus the challenge (SHA-256 of the verifier) sent to Google. */
export function newOAuthAttempt() {
  const state = random();
  const verifier = random();
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function authorizeUrl(opts: { clientId: string; redirectUri: string; state: string; challenge: string }): string {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** The cookie value is "<state>.<verifier>" (both base64url, so no dots inside). */
export const oauthCookieValue = (state: string, verifier: string) => `${state}.${verifier}`;

export function parseOAuthCookie(value: string | undefined): { state: string; verifier: string } | null {
  const [state, verifier, ...rest] = (value ?? "").split(".");
  return state && verifier && rest.length === 0 ? { state, verifier } : null;
}

export type GoogleProfile = { sub: string; email: string; name: string };

const claims = z.object({
  iss: z.string(),
  aud: z.string(),
  exp: z.number(),
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.literal(true),
  given_name: z.string().optional(),
  name: z.string().optional(),
});

/**
 * The Google account an id_token describes, or null if it isn't for us, has expired
 * or its email isn't verified. The signature is not checked: the token comes straight
 * from Google's token endpoint over TLS, which OpenID Connect accepts in its place
 * (OIDC Core §3.1.3.7). Never use this on a token received from the browser.
 */
export function profileFromIdToken(idToken: string, clientId: string, nowSec: number): GoogleProfile | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const parsed = claims.safeParse(json);
  if (!parsed.success) return null;
  const c = parsed.data;
  if (!ISSUERS.includes(c.iss) || c.aud !== clientId || c.exp <= nowSec) return null;

  const email = c.email.toLowerCase();
  const name = c.given_name?.trim() || c.name?.trim() || email.split("@")[0];
  return { sub: c.sub, email, name };
}

/** Trades the one-time code for the account's profile (null if Google refuses or the token is invalid). */
export async function fetchProfile(opts: {
  env: GoogleEnv;
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<GoogleProfile | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: opts.env.clientId,
      client_secret: opts.env.clientSecret,
      code: opts.code,
      code_verifier: opts.verifier,
      grant_type: "authorization_code",
      redirect_uri: opts.redirectUri,
    }),
  });
  if (!res.ok) return null;
  const body = z.object({ id_token: z.string() }).safeParse(await res.json().catch(() => null));
  if (!body.success) return null;
  return profileFromIdToken(body.data.id_token, opts.env.clientId, Math.floor(Date.now() / 1000));
}
