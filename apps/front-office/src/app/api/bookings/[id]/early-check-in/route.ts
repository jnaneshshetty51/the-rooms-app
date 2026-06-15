// apps/front-office/src/app/api/bookings/[id]/early-check-in/route.ts
// Early Check-in Request Handling

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { requestEarlyCheckIn, getEarlyCheckInStatus } from '@the-rooms/db/queries/earlyCheckInQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const requestEarlyCheckInSchema = z.object({
    requestedTime: z.string().datetime({ message: 'Invalid requested time' }),
    reason: z.string().optional(),
});

// ─── POST /api/bookings/[id]/early-check-in ────────────────────────────────────
// Request early check-in for a booking

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = requestEarlyCheckInSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { requestedTime, reason } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id },
            include: { room: true },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (booking.status !== 'CONFIRMED') {
            return badRequest(
                'Early check-in can only be requested for confirmed bookings',
                'INVALID_STATUS'
            );
        }

        const result = await requestEarlyCheckIn(
            id,
            new Date(requestedTime),
            reason
        );

        // Audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: 'EARLY_CHECKIN_REQUESTED',
            entity: 'booking',
            entityId: id,
            metadata: {
                requestedTime,
                type: result.type,
                noCharge: result.noCharge,
                fee: result.fee,
                canCheckIn: result.canCheckIn,
                roomReady: result.roomReady,
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
        console.error('[EARLY_CHECKIN_REQUEST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── GET /api/bookings/[id]/early-check-in ─────────────────────────────────────
// Get early check-in status for a booking

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const booking = await db.booking.findUnique({
            where: { id },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        const status = await getEarlyCheckInStatus(id);

        return ok(status);
    } catch (error) {
        console.error('[EARLY_CHECKIN_STATUS]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
