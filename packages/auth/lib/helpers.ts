// packages/auth/lib/helpers.ts
import bcrypt from "bcryptjs"
import { auth } from "../index"
import type { Role } from "@the-rooms/types"

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt (salt rounds = 12)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Check if a given password matches a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Get the current session user (server-side only)
 * Returns null if not authenticated
 */
export async function getSessionUser() {
  const session = await auth()
  if (!session?.user) return null
  return session.user as { id: string; email: string; name: string | null; role: Role }
}

/**
 * Get the current user ID (server-side only)
 * Throws if not authenticated
 */
export async function getSessionUserId(): Promise<string> {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized: No active session")
  return user.id
}

/**
 * Check if the current user has one of the allowed roles.
 * If roles is undefined, just checks authentication.
 * Throws if not authenticated or doesn't have required role.
 */
export async function requireAuth(roles?: Role[]): Promise<{ id: string; email: string; name: string | null; role: Role }> {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized: No active session")

  if (roles && roles.length > 0) {
    if (!canAccess(user.role, roles)) {
      throw new Error(`Forbidden: Requires one of roles [${roles.join(", ")}]`)
    }
  }

  return user
}

/**
 * Check if a given role is within the allowed roles list
 */
export function canAccess(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole)
}

/**
 * Get portal redirect URL based on role
 */
export function getRoleRedirectUrl(role: Role): string {
  const redirects: Record<Role, string> = {
    SUPER_ADMIN: "/dashboard",
    ADMIN: "/dashboard",
    FRONT_OFFICE: "/dashboard",
    GUEST: "/dashboard",
  }
  return redirects[role] ?? "/"
}

/**
 * Get portal home URL based on role
 */
export function getPortalHomeUrl(role: Role): string {
  const portals: Record<Role, string> = {
    SUPER_ADMIN: "http://superadmin.therooms.in",
    ADMIN: "http://admin.therooms.in",
    FRONT_OFFICE: "http://fo.therooms.in",
    GUEST: "http://my.therooms.in",
  }
  return portals[role] ?? "/"
}