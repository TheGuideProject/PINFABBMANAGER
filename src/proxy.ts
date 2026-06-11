import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/server/auth.config";

// JWT-only NextAuth instance (no Prisma/bcrypt in the proxy bundle).
// Real authorization happens in Server Actions via requireRole().
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;
  const isLoggedIn = !!user;

  const isLogin = nextUrl.pathname.startsWith("/login");
  const isManagerArea = nextUrl.pathname.startsWith("/manager");
  const isTechArea = nextUrl.pathname.startsWith("/tech");

  if (isLogin) {
    if (isLoggedIn) {
      const home = user.role === "TECHNICIAN" ? "/tech" : "/manager";
      return NextResponse.redirect(new URL(home, nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isManagerArea && user.role === "TECHNICIAN") {
    return NextResponse.redirect(new URL("/tech", nextUrl));
  }
  if (isTechArea && user.role !== "TECHNICIAN") {
    return NextResponse.redirect(new URL("/manager", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Everything except Next internals, auth endpoints, PWA assets and files
  matcher: [
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
