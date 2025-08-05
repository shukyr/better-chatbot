import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Allow all API routes to pass through without session check
  // The individual API routes should handle their own authentication
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow auth-related pages
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return NextResponse.next();
  }

  // Check session for protected routes
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // For API requests, return JSON error instead of redirect
    if (
      request.headers.get("accept")?.includes("application/json") ||
      request.headers.get("content-type")?.includes("application/json")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
