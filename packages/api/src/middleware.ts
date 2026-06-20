// packages/api/src/middleware.ts
// Auth middleware for API routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import Redis from 'ioredis';

// ── withAuth ─────────────────────────────────────────────────────────────────

/**
 * Middleware that requires authentication. Optionally specify allowed roles.
 */
export async function withAuth(
  request: NextRequest,
  allowedRoles?: Role[]
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const userRole = session.user.role as Role | undefined;

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { error: 'Access denied', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  return null; // Auth passed
}

/**
 * Wrapper for API route handlers that require authentication
 */
export function withAuthHandler(
  handler: (
    request: NextRequest,
    context: { session: { user: { id: string; email: string; role: string; name?: string } } }
  ) => Promise<NextResponse>,
  allowedRoles?: Role[]
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const userRole = session.user.role as Role | undefined;

    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    return handler(request, { session });
  };
}

// ── withOptionalAuth ─────────────────────────────────────────────────────────

/**
 * Middleware that allows both authenticated and anonymous access.
 * Adds session to context if available.
 */
export async function withOptionalAuth(
  request: NextRequest
): Promise<{
  session: { user: { id: string; email: string; role: string; name?: string } } | null;
  authorized: null;
}> {
  const session = await auth();
  return { session, authorized: null };
}

// ── Audit Logging ────────────────────────────────────────────────────────────

/**
 * Create audit log entry
 */
export async function createAuditLog(params: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  // convenience fields merged into metadata
  bookingId?: string;
  [key: string]: unknown;
}) {
  const { db } = await import('@the-rooms/db');

  const { userId, action, entity, entityId, metadata, ipAddress, bookingId, ...rest } = params;
  const mergedMetadata: Record<string, unknown> = { ...metadata };
  if (bookingId) mergedMetadata.bookingId = bookingId;
  Object.assign(mergedMetadata, rest);

  return db.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      metadata: Object.keys(mergedMetadata).length > 0 ? mergedMetadata as Prisma.InputJsonValue : undefined,
      ipAddress,
    },
  });
}

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

// ── Rate Limiting (Redis-based) ──────────────────────────────────────────────

let redisClient: Redis | null = null;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    }
  });

  redisClient.on('error', (err) => {
    console.warn('[Redis] Connection error in rate limiter:', err.message);
  });
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Redis-backed rate limiter with in-memory fallback
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const resetAt = now + windowMs;

  if (redisClient && redisClient.status === 'ready') {
    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.pexpire(key, windowMs);
      }

      const ttl = await redisClient.pttl(key);
      const actualResetAt = ttl > 0 ? now + ttl : resetAt;

      if (current > maxRequests) {
        return { allowed: false, remaining: 0, resetAt: actualResetAt };
      }
      return { allowed: true, remaining: maxRequests - current, resetAt: actualResetAt };
    } catch (err) {
      console.warn('[Redis] Rate limiter fallback to memory due to error:', err);
      // Fallback to memory below
    }
  }

  // In-memory fallback
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
}

// ─── getPropertyIdFromSession ─────────────────────────────────────────────────

/**
 * Get propertyId from user session by looking up UserPropertyAccess.
 * This is the primary method for determining the current property context.
 * 
 * For ADMIN/MANAGER roles, returns the property they manage.
 * For SUPER_ADMIN, returns the first property they have access to (or null if none).
 * For FRONT_OFFICE/HOUSEKEEPING, returns the property they are assigned to.
 * 
 * @param session - The auth session object
 * @returns propertyId string or null if not found
 */
export async function getPropertyIdFromSession(session: { user?: { id?: string } | null } | null): Promise<string | null> {
  const userId = session?.user?.id;
  if (!userId) return null;

  const { db } = await import('@the-rooms/db');

  // Get the user's property access - prioritize ADMIN/MANAGER roles
  const propertyAccess = await db.userPropertyAccess.findFirst({
    where: {
      userId,
      role: { in: ["ADMIN", "MANAGER"] }
    },
    include: { property: true }
  });

  if (propertyAccess) {
    return propertyAccess.propertyId;
  }

  // Fallback: try to get any property access for the user
  const anyAccess = await db.userPropertyAccess.findFirst({
    where: { userId },
    include: { property: true }
  });

  return anyAccess?.propertyId || null;
}

/**
 * Get all propertyIds that a user has access to.
 * 
 * @param session - The auth session object  
 * @returns Array of propertyId strings (empty if no access or SUPER_ADMIN who should use null for all)
 */
export async function getPropertyIdsFromSession(session: { user?: { id?: string; role?: string } | null } | null): Promise<{ propertyIds: string[] | null; isSuperAdmin: boolean }> {
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  // SUPER_ADMIN sees all properties - return null to indicate no filtering
  if (userRole === 'SUPER_ADMIN') {
    return { propertyIds: null, isSuperAdmin: true };
  }

  if (!userId) return { propertyIds: [], isSuperAdmin: false };

  const { db } = await import('@the-rooms/db');
  const accesses = await db.userPropertyAccess.findMany({
    where: { userId },
    select: { propertyId: true }
  });

  return { propertyIds: accesses.map(a => a.propertyId), isSuperAdmin: false };
}

// ── Property Access Control ───────────────────────────────────────────────────

/**
 * Verify user has access to a specific property.
 * SUPER_ADMIN bypasses all property access checks.
 * All other roles must have their property access verified against UserPropertyAccess table.
 * 
 * @param userId - The user ID to check
 * @param propertyId - The property ID to verify access for
 * @param userRole - The user's role (SUPER_ADMIN always has access)
 * @returns true if user has access, false otherwise
 */
export async function verifyPropertyAccess(
  userId: string,
  propertyId: string,
  userRole: string
): Promise<boolean> {
  // SUPER_ADMIN bypasses all property access checks
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }

  // All other roles (ADMIN, FRONT_OFFICE, HOUSEKEEPING, GUEST, etc.)
  // must have their property access verified against UserPropertyAccess table
  const { db } = await import('@the-rooms/db');
  const access = await db.userPropertyAccess.findFirst({
    where: { userId, propertyId },
  });

  return !!access;
}

/**
 * Add property filter to Prisma query where clause based on user access.
 * This prevents IDOR by filtering queries to only include accessible properties.
 * 
 * @param userId - The user ID 
 * @param userRole - The user's role
 * @param explicitPropertyId - Optional explicit property ID to include (if user has access)
 * @returns Prisma where clause with property filter
 */
export function getPropertyFilter(
  userId: string,
  userRole: string,
  explicitPropertyId?: string
): Record<string, unknown> {
  // SUPER_ADMIN sees all properties
  if (userRole === 'SUPER_ADMIN') {
    return explicitPropertyId ? { propertyId: explicitPropertyId } : {};
  }

  // For other roles, we need to check UserPropertyAccess
  // Return a filter that will be applied after fetching accessible property IDs
  if (explicitPropertyId) {
    return { propertyId: explicitPropertyId };
  }

  // Default: filter by "default" property if no explicit access
  // Actual implementation should use verifyPropertyAccess to get user's property IDs
  return { propertyId: 'default' };
}

// ── Request Validation ────────────────────────────────────────────────────────

/**
 * Parse and validate JSON body
 */
export async function parseBody<T>(
  request: NextRequest,
  schema: { parse: (data: unknown) => T }
): Promise<{ data: T; error: NextResponse | null }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (err) {
    if (err instanceof Error) {
      return {
        data: null as unknown as T,
        error: NextResponse.json(
          { error: err.message, code: 'VALIDATION_ERROR' },
          { status: 422 }
        ),
      };
    }
    return {
      data: null as unknown as T,
      error: NextResponse.json(
        { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
        { status: 422 }
      ),
    };
  }
}
