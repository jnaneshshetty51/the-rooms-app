// apps/front-office/src/app/api/price-overrides/route.ts
// Price Override Requests API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { createPriceOverrideRequest, getPendingPriceOverrides, getPriceOverridesByBooking } from '@the-rooms/db/queries/priceOverrideQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createPriceOverrideSchema = z.object({
    bookingId: z.string().optional(),
    roomId: z.string().optional(),
    originalPrice: z.number().positive('Original price must be positive'),
    overriddenPrice: z.number().positive('Overridden price must be positive'),
    reason: z.string().min(1, 'Reason is required'),
    effectiveFrom: z.string().datetime().optional(),
    effectiveUntil: z.string().datetime().optional(),
}).refine(data => data.bookingId || data.roomId, {
    message: 'Either bookingId or roomId must be provided',
});

const listPriceOverridesSchema = z.object({
    bookingId: z.string().optional(),
    limit: z.number().int().positive().optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
});

// ─── GET /api/price-overrides ──────────────────────────────────────────────
// List pending price override requests or requests for a specific booking

export async function GET(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { searchParams } = new URL(request.url);
        const bookingId = searchParams.get('bookingId');
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // If bookingId is provided, get requests for that booking
        if (bookingId) {
            // Check if booking exists
            const booking = await db.booking.findUnique({
                where: { id: bookingId },
            });

            if (!booking) {
                return notFound('Booking', 'BOOKING_NOT_FOUND');
            }

            const requests = await getPriceOverridesByBooking(bookingId);
            return ok({ requests, total: requests.length });
        }

        // Otherwise, get all pending requests
        const result = await getPendingPriceOverrides({ limit, offset });
        return ok(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[PRICE_OVERRIDES_LIST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/price-overrides ─────────────────────────────────────────────
// Create a new price override request

export async function POST(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const body = await request.json();
        const parsed = createPriceOverrideSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { bookingId, roomId, originalPrice, overriddenPrice, reason, effectiveFrom, effectiveUntil } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Validate booking exists if provided
        if (bookingId) {
            const booking = await db.booking.findUnique({
                where: { id: bookingId },
            });

            if (!booking) {
                return notFound('Booking', 'BOOKING_NOT_FOUND');
            }

            if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
                return badRequest('Can only request price overrides for confirmed or checked-in bookings', 'INVALID_STATUS');
            }
        }

        // Validate room exists if provided
        if (roomId) {
            const room = await db.room.findUnique({
                where: { id: roomId },
            });

            if (!room) {
                return notFound('Room', 'ROOM_NOT_FOUND');
            }
        }

        const result = await createPriceOverrideRequest({
            bookingId,
            roomId,
            originalPrice,
            overriddenPrice,
            reason,
            requestedById: userId!,
            effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
            effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : undefined,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: bookingId || undefined,
            action: 'PRICE_OVERRIDE_REQUESTED',
            entity: 'priceOverride',
            entityId: result.id,
            metadata: {
                originalPrice,
                overriddenPrice,
                reason,
                effectiveFrom,
                effectiveUntil,
            },
            ipAddress: getClientIp(request),
        });

        return ok(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (message.includes('already a pending')) {
            return badRequest(message, 'PENDING_EXISTS');
        }
        if (message.includes('Booking not found') || message.includes('Room not found')) {
            return badRequest(message, 'INVALID_REFERENCE');
        }
        console.error('[PRICE_OVERRIDE_CREATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
