import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authEnv, userFromToken } from "./auth";

/** The logged-in user for this request (verified from the cookie), or null. */
export async function currentUser(): Promise<string | null> {
  return userFromToken((await cookies()).get(AUTH_COOKIE)?.value, authEnv());
}

export const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });
