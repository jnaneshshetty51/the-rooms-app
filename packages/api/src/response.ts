// packages/api/src/response.ts
// Standardized API response helpers

import { NextResponse } from 'next/server';

// ── Response Types ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

// ── Success Responses ─────────────────────────────────────────────────────────

/**
 * 200 OK — generic success
 */
export function ok<T>(data?: T, meta?: ResponseMeta): NextResponse {
  const body: ApiResponse<T> = { data, meta };
  return NextResponse.json(body, { status: 200 });
}

/**
 * 201 Created — resource created
 */
export function created<T>(data?: T, meta?: ResponseMeta): NextResponse {
  const body: ApiResponse<T> = { data, meta };
  return NextResponse.json(body, { status: 201 });
}

/**
 * 200 OK with pagination
 */
export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): NextResponse {
  const body: ApiResponse<T[]> = {
    data: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
  return NextResponse.json(body, { status: 200 });
}

// ── Error Responses ───────────────────────────────────────────────────────────

/**
 * 400 Bad Request
 */
export function badRequest(
  message: string = 'Bad request',
  code?: string
): NextResponse {
  return NextResponse.json(
    { error: message, code: code ?? 'BAD_REQUEST' } as ApiResponse,
    { status: 400 }
  );
}

/**
 * 401 Unauthorized
 */
export function unauthorized(
  message: string = 'Unauthorized',
  code?: string
): NextResponse {
  return NextResponse.json(
    { error: message, code: code ?? 'UNAUTHORIZED' } as ApiResponse,
    { status: 401 }
  );
}

/**
 * 403 Forbidden
 */
export function forbidden(
  message: string = 'Access denied',
  code?: string
): NextResponse {
  return NextResponse.json(
    { error: message, code: code ?? 'FORBIDDEN' } as ApiResponse,
    { status: 403 }
  );
}

/**
 * 404 Not Found
 */
export function notFound(
  entity: string = 'Resource',
  code?: string
): NextResponse {
  return NextResponse.json(
    { error: `${entity} not found`, code: code ?? 'NOT_FOUND' } as ApiResponse,
    { status: 404 }
  );
}

/**
 * 409 Conflict — e.g., duplicate resource
 */
export function conflict(
  message: string = 'Resource already exists',
  code?: string
): NextResponse {
  return NextResponse.json(
    { error: message, code: code ?? 'CONFLICT' } as ApiResponse,
    { status: 409 }
  );
}

/**
 * 422 Unprocessable Entity — validation error
 */
export function validationError(
  errors: string[],
  code: string = 'VALIDATION_ERROR'
): NextResponse {
  return NextResponse.json(
    { error: errors.join(', '), code, data: errors } as ApiResponse,
    { status: 422 }
  );
}

/**
 * 429 Too Many Requests
 */
export function rateLimited(
  message: string = 'Too many requests',
  retryAfter?: number
): NextResponse {
  const headers: HeadersInit = {};
  if (retryAfter) {
    headers['Retry-After'] = String(retryAfter);
  }
  return NextResponse.json(
    { error: message, code: 'RATE_LIMITED' } as ApiResponse,
    { status: 429, headers }
  );
}

/**
 * 500 Internal Server Error
 */
export function serverError(
  message: string = 'Internal server error',
  code?: string
): NextResponse {
  // Don't expose internal details in production
  const errorMessage =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : message;

  return NextResponse.json(
    { error: errorMessage, code: code ?? 'INTERNAL_ERROR' } as ApiResponse,
    { status: 500 }
  );
}

/**
 * 503 Service Unavailable
 */
export function serviceUnavailable(
  message: string = 'Service temporarily unavailable',
  retryAfter?: number
): NextResponse {
  const headers: HeadersInit = {};
  if (retryAfter) {
    headers['Retry-After'] = String(retryAfter);
  }
  return NextResponse.json(
    { error: message, code: 'SERVICE_UNAVAILABLE' } as ApiResponse,
    { status: 503, headers }
  );
}
