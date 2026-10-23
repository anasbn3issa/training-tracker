import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authEnv, isValidToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  if (isValidToken(request.cookies.get(AUTH_COOKIE)?.value, authEnv())) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except the login page/endpoint and Next's static assets.
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
