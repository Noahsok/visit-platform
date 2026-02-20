import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ROLES = ["owner", "manager"];
const STAFF_ROLES = ["bartender", "door", "prep"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icon-") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/workbox-"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect unauthenticated users to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;

  // Extract venue slug from path: /[venue]/staff/... or /[venue]/...
  const segments = pathname.split("/").filter(Boolean);
  const venue = segments[0];

  // Staff users trying to access admin routes
  if (STAFF_ROLES.includes(role)) {
    const isStaffRoute = segments[1] === "staff";
    const isApiRoute = venue === "api";

    if (!isStaffRoute && !isApiRoute && venue && segments.length > 0) {
      // If it's a venue route but not /staff, redirect to staff view
      // Ignore top-level routes like /login
      if (segments.length >= 1 && venue !== "login") {
        const staffUrl = new URL(`/${venue}/staff`, request.url);
        return NextResponse.redirect(staffUrl);
      }
    }
  }

  // Admin users can access both admin and staff views (toggle support)
  // No redirect needed for admin roles

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder files (icons, manifest, sw)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon-.*|manifest\\.json|sw\\.js|workbox-.*).*)",
  ],
};
