// apps/web/middleware.ts
// Web app — primarily public, but protects admin routes if any
import { auth } from "@the-rooms/auth/edge"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public paths — no auth required
const publicPaths = ["/", "/rooms", "/booking", "/about", "/contact", "/api/public"]
const publicPrefixes = ["/_next", "/favicon", "/images", "/assets"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  for (const prefix of publicPrefixes) {
    if (pathname.startsWith(prefix)) return NextResponse.next()
  }

  for (const path of publicPaths) {
    if (pathname === path) return NextResponse.next()
  }

  // Web app doesn't use NextAuth session by default for public browsing
  // Staff-only routes under /admin/* should redirect to respective portal
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}