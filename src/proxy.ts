import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authEnv, userFromToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  if (userFromToken(request.cookies.get(AUTH_COOKIE)?.value, authEnv())) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except the login page/endpoint, Next's static assets and the PWA files
  // (the browser fetches the manifest and icons without cookies).
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|icon.svg|icons/|manifest.webmanifest|sw.js).*)"],
};
