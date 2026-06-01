// apps/guest-portal/middleware.ts
// Enforces GUEST role — staff members are redirected to their respective portal
import { auth } from "@the-rooms/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Role } from "@the-rooms/types"

const GUEST_PORTAL_URL = "http://my.therooms.in"
const STAFF_PORTALS: Record<Role, string> = {
  SUPER_ADMIN: "http://superadmin.therooms.in",
  ADMIN: "http://admin.therooms.in",
  FRONT_OFFICE: "http://fo.therooms.in",
  GUEST: GUEST_PORTAL_URL,
}

export async function middleware(request: NextRequest) {
  const session = await auth()

  // Not authenticated — redirect to login
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", encodeURIComponent(request.url))
    return NextResponse.redirect(loginUrl)
  }

  const userRole = (session.user as { role?: string }).role as Role | undefined

  // No role set — treat as unauthenticated
  if (!userRole) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // GUEST role — allow access
  if (userRole === "GUEST") {
    return NextResponse.next()
  }

  // Staff trying to access guest portal — redirect to their portal
  if (userRole in STAFF_PORTALS && userRole !== "GUEST") {
    const redirectUrl = new URL(STAFF_PORTALS[userRole])
    return NextResponse.redirect(redirectUrl)
  }

  // Fallback — shouldn't reach here, but redirect to guest portal login
  return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
}