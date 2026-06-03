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
}) {
  const { db } = await import('@the-rooms/db');

  return db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue,
      ipAddress: params.ipAddress,
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
