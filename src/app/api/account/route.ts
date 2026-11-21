import { NextResponse } from "next/server";
import { AUTH_COOKIE, NAME_COOKIE, USER_COOKIE } from "@/lib/auth";
import { currentUser, unauthorized } from "@/lib/current-user";
import { db } from "@/lib/supabase";

/** Deletes the signed-in user and all their data (see delete_user), then signs them out. Cannot be undone. */
export async function DELETE() {
  const userId = await currentUser();
  if (!userId) return unauthorized();

  const { error } = await db().rpc("delete_user", { p_user: userId });
  if (error) return Response.json({ error: "Couldn't delete your account. Try again." }, { status: 500 });

  const response = NextResponse.json({ ok: true });
  for (const name of [AUTH_COOKIE, USER_COOKIE, NAME_COOKIE]) response.cookies.delete({ name, path: "/" });
  return response;
}
