import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export { USER_COOKIE, NAME_COOKIE } from "./user-cookie";

// People sign in with Google (src/app/api/auth). After that the browser holds an
// httpOnly cookie "<userId>.<HMAC(AUTH_SECRET, userId)>": it names the user and
// proves our server issued it. Rotating AUTH_SECRET logs every device out.

export const AUTH_COOKIE = "tt_auth";
export const AUTH_MAX_AGE_SEC = 60 * 60 * 24 * 365;

type AuthEnv = { secret: string };

const sha256 = (value: string) => createHash("sha256").update(value).digest();

// Hashing first gives equal-length buffers, so timingSafeEqual never throws
// and the comparison leaks nothing about the length.
export const safeEqual = (a: string, b: string) => timingSafeEqual(sha256(a), sha256(b));

const signature = (userId: string, env: AuthEnv) => createHmac("sha256", env.secret).update(userId).digest("base64url");

export const authToken = (userId: string, env: AuthEnv) => `${userId}.${signature(userId, env)}`;

/** The user a cookie token belongs to, or null if it isn't valid (any more). */
export function userFromToken(token: string | undefined, env: AuthEnv): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  return safeEqual(token, authToken(userId, env)) ? userId : null;
}

export function authEnv(): AuthEnv {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be set");
  return { secret };
}
