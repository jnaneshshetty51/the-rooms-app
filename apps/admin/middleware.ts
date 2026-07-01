// apps/admin/middleware.ts
// Enforces ADMIN role only (also allows SUPER_ADMIN)
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
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const userRole = (session.user as { role?: string }).role as Role | undefined

  if (!userRole) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // ADMIN or SUPER_ADMIN can access admin portal
  if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
    return NextResponse.next()
  }

  // Wrong role — show access denied
  return NextResponse.redirect(new URL("/access-denied", request.url))
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
