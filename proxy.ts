import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";
import { canAccess, type Role } from "@/lib/permissions";

const { auth } = NextAuth(authConfig);

const PUBLIC_EXACT = ["/"];
const PUBLIC_PREFIXES = [
  "/api/auth",
  "/api/cron",
  "/api/revenue",
  "/api/consultation",
  "/consultation",
];
const AUTH_PAGES = ["/login"];
// Reachable by any signed-in user regardless of role:
const ROLE_EXEMPT = ["/unauthorized"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isPublic =
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  const isRoleExempt = ROLE_EXEMPT.some((p) => pathname.startsWith(p));

  // Logged-in users can't see login — bounce to dashboard.
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Public and auth routes are always reachable.
  if (isPublic || isAuthPage) {
    return NextResponse.next();
  }

  // Everything else requires a session.
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Signed in — let the always-allowed pages through without a role check.
  if (isRoleExempt) {
    return NextResponse.next();
  }

  // Role-based access for protected app routes.
  const role = req.auth?.user?.role as Role | undefined;
  if (!role || !canAccess(role, pathname)) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:js|css|map|png|jpg|jpeg|svg|ico|woff|woff2)).*)",
  ],
};