import { type NextRequest, NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PREFIXES = ["/login", "/auth/callback", "/access"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!isSupabaseConfigured()) {
    return response;
  }

  // Session refresh only for public routes; gating happens in layouts/pages via resolveAccess.
  // Still block /app and /admin when there is clearly no auth cookie to avoid empty shells.
  if (isPublicPath(pathname)) {
    return response;
  }

  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.includes("auth-token") || c.name.startsWith("sb-"));

  if (
    (pathname.startsWith("/app") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/onboarding")) &&
    !hasAuthCookie
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimizations.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
