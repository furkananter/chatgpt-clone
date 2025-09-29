import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "chatgpt_auth";
const REFRESH_COOKIE_NAME = "chatgpt_refresh";

// Define public routes that don't require authentication
const publicRoutes = ["/", "/register", "/auth"];

// Define protected routes that require authentication
const protectedRoutes = ["/chat"];

function hasValidAuthToken(request: NextRequest): boolean {
  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // Check if auth token exists
  if (!authToken) {
    return false;
  }

  try {
    // Basic JWT structure check (header.payload.signature)
    const parts = authToken.split(".");
    if (parts.length !== 3) {
      return false;
    }

    // Decode payload to check expiration
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

function hasRefreshToken(request: NextRequest): boolean {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (refreshToken) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuthToken = hasValidAuthToken(request);
  const hasRefresh = !hasAuthToken && hasRefreshToken(request);
  const isAuthenticated = hasAuthToken || hasRefresh;

  // Log authentication status in development only
  if (process.env.NODE_ENV === 'development') {
    console.log(`Auth check: ${pathname} - ${isAuthenticated ? 'authenticated' : 'not authenticated'}`);
  }

  // Allow public routes regardless of authentication status
  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route)
    )
  ) {
    // If user is authenticated and trying to access landing page, redirect to chat
    if (pathname === "/" && isAuthenticated) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }
    return NextResponse.next();
  }

  // Protect chat and other authenticated routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
