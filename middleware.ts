import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth?.user) {
    const signInUrl = req.nextUrl.clone();
    signInUrl.pathname = "/login";
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
});

// Excludes /api (routes authorize themselves), /login, /scan (QR landing
// resolves publicly-scoped info only, real actions still require login on
// the destination page), static assets, and the brand logo (shown
// unauthenticated on /login itself, so it can't require a session to load).
export const config = {
  matcher: [
    "/((?!api|login|_next/static|_next/image|favicon.ico|eagle-labs-logo.jpg|$).*)",
  ],
};
