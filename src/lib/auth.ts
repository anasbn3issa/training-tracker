import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// One user, one password (APP_PASSWORD). After login the browser holds an
// httpOnly cookie whose value is HMAC(AUTH_SECRET, APP_PASSWORD): it proves the
// password was entered without containing it, and changes if the password does.

export const AUTH_COOKIE = "tt_auth";
export const AUTH_MAX_AGE_SEC = 60 * 60 * 24 * 365;

type AuthEnv = { password: string; secret: string };

const sha256 = (value: string) => createHash("sha256").update(value).digest();

// Hashing first gives equal-length buffers, so timingSafeEqual never throws
// and the comparison leaks nothing about the length.
const safeEqual = (a: string, b: string) => timingSafeEqual(sha256(a), sha256(b));

export const authToken = ({ password, secret }: AuthEnv) => createHmac("sha256", secret).update(password).digest("base64url");

export const isValidToken = (token: string | undefined, env: AuthEnv) => token !== undefined && safeEqual(token, authToken(env));

export const passwordMatches = (candidate: string, env: AuthEnv) => safeEqual(candidate, env.password);

export function authEnv(): AuthEnv {
  const password = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password || !secret) throw new Error("APP_PASSWORD and AUTH_SECRET must be set");
  return { password, secret };
}
