// apps/super-admin/middleware.ts
// Enforces SUPER_ADMIN role only
import { auth } from "@the-rooms/auth/edge"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Role } from "@the-rooms/types"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let login and access-denied pages through without auth check
  if (pathname.startsWith("/login") || pathname.startsWith("/access-denied") || pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname === "/" ? "/dashboard" : pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Logged-in: redirect root directly to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  const userRole = (session.user as { role?: string }).role as Role | undefined

  if (!userRole) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (userRole === "SUPER_ADMIN") {
    return NextResponse.next()
  }

  // Wrong role — show access denied
  return NextResponse.redirect(new URL("/access-denied", request.url))
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
