import { cookies } from "next/headers";
import { AUTH_COOKIE, AUTH_MAX_AGE_SEC, authEnv, authToken, passwordMatches } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = form.get("password");
  const env = authEnv();

  if (typeof password !== "string" || !passwordMatches(password, env)) {
    return Response.json({ error: "wrong password" }, { status: 401 });
  }

  (await cookies()).set(AUTH_COOKIE, authToken(env), {
    httpOnly: true,
    sameSite: "lax",
    // Only over HTTPS, so testing over http://<laptop-ip> on the phone still works locally.
    secure: new URL(request.url).protocol === "https:",
    maxAge: AUTH_MAX_AGE_SEC,
    path: "/",
  });
  return Response.json({ ok: true });
}
