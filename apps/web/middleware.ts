// apps/web/middleware.ts
// Web app is primarily public — all pages are accessible without login.
// Only blocks direct /admin or /staff URL attempts (should use respective portals).
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block staff routes that don't belong on the public site
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|icons/|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
