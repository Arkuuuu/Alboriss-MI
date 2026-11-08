import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/session-token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Protect Root Data Entry Route ("/")
  if (pathname === "/") {
    const authCookie = req.cookies.get("auth_session");
    if (!authCookie || !authCookie.value) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    const { valid } = await verifySessionToken(authCookie.value);
    if (!valid) {
      const loginUrl = new URL("/login", req.url);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete("auth_session");
      return res;
    }

    return NextResponse.next();
  }

  // 2. If authenticated user tries to open "/login", redirect to "/"
  if (pathname === "/login") {
    const authCookie = req.cookies.get("auth_session");
    if (authCookie && authCookie.value) {
      const { valid } = await verifySessionToken(authCookie.value);
      if (valid) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};
