import "server-only";
import { cookies } from "next/headers";
import { isActiveUser } from "./accounts-db";
import { AUTH_COOKIE, authEnv, userFromToken } from "./auth";
import { db } from "./supabase";

/**
 * The logged-in user for this request, or null. The cookie proves who they are; the database says
 * whether they may still use the app (a deleted or blocked user keeps a valid cookie for a year).
 */
export async function currentUser(): Promise<string | null> {
  const userId = userFromToken((await cookies()).get(AUTH_COOKIE)?.value, authEnv());
  if (!userId) return null;
  return (await isActiveUser(db(), userId)) ? userId : null;
}

export const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });
