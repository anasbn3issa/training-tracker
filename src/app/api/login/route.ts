import { cookies } from "next/headers";
import { AUTH_COOKIE, AUTH_MAX_AGE_SEC, USER_COOKIE, authEnv, authToken, passwordMatches } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const user = form.get("user");
  const password = form.get("password");
  const env = authEnv();

  if (typeof user !== "string" || typeof password !== "string" || !passwordMatches(user, password, env)) {
    return Response.json({ error: "wrong password" }, { status: 401 });
  }

  const options: { sameSite: "lax"; secure: boolean; maxAge: number; path: string } = {
    sameSite: "lax",
    // Only over HTTPS, so testing over http://<laptop-ip> on the phone still works locally.
    secure: new URL(request.url).protocol === "https:",
    maxAge: AUTH_MAX_AGE_SEC,
    path: "/",
  };
  const jar = await cookies();
  jar.set(AUTH_COOKIE, authToken(user, env), { ...options, httpOnly: true });
  jar.set(USER_COOKIE, user, options);
  return Response.json({ ok: true });
}
