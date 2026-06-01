// apps/admin/middleware.ts
// Enforces ADMIN role only (also allows SUPER_ADMIN)
import { auth } from "@the-rooms/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Role } from "@the-rooms/types"

export async function middleware(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", encodeURIComponent(request.url))
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
  const deniedUrl = new URL("/access-denied", request.url)
  return NextResponse.redirect(deniedUrl)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
}