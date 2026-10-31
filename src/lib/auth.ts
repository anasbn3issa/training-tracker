import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { USERS } from "./users";

export { USER_COOKIE } from "./user-cookie";

// A few known users, one password each (PASSWORD_<ID> env vars). After login the
// browser holds an httpOnly cookie "<userId>.<HMAC(AUTH_SECRET, userId:password)>":
// it names the user and proves the password was entered without containing it.
// Changing a user's password changes their signature, so only they get logged out.

export const AUTH_COOKIE = "tt_auth";
export const AUTH_MAX_AGE_SEC = 60 * 60 * 24 * 365;

type AuthEnv = { secret: string; passwords: Record<string, string> };

const sha256 = (value: string) => createHash("sha256").update(value).digest();

// Hashing first gives equal-length buffers, so timingSafeEqual never throws
// and the comparison leaks nothing about the length.
const safeEqual = (a: string, b: string) => timingSafeEqual(sha256(a), sha256(b));

const signature = (userId: string, env: AuthEnv) =>
  createHmac("sha256", env.secret).update(`${userId}:${env.passwords[userId]}`).digest("base64url");

export function passwordMatches(userId: string, candidate: string, env: AuthEnv): boolean {
  const password = env.passwords[userId];
  return password !== undefined && password !== "" && safeEqual(candidate, password);
}

export const authToken = (userId: string, env: AuthEnv) => `${userId}.${signature(userId, env)}`;

/** The user a cookie token belongs to, or null if it isn't valid (any more). */
export function userFromToken(token: string | undefined, env: AuthEnv): string | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  if (!env.passwords[userId]) return null;
  return safeEqual(token, authToken(userId, env)) ? userId : null;
}

export function authEnv(): AuthEnv {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be set");
  const passwords: Record<string, string> = {};
  for (const { id } of USERS) {
    const password = process.env[`PASSWORD_${id.toUpperCase()}`];
    if (password) passwords[id] = password;
  }
  return { secret, passwords };
}
