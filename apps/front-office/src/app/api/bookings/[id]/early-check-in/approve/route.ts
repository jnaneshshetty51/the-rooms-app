// apps/front-office/src/app/api/bookings/[id]/early-check-in/approve/route.ts
// Approve/Deny Early Check-in Request

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { approveEarlyCheckIn } from '@the-rooms/db/queries/earlyCheckInQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const approveEarlyCheckInSchema = z.object({
    approved: z.boolean(),
    rejectionReason: z.string().optional(),
});

// ─── PATCH /api/bookings/[id]/early-check-in/approve ───────────────────────────
// Approve or deny early check-in request

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = approveEarlyCheckInSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { approved, rejectionReason } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id },
            include: { room: true },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (!booking.earlyCheckInRequested) {
            return badRequest(
                'No early check-in request found for this booking',
                'NO_EARLY_CHECKIN_REQUEST'
            );
        }

        const result = await approveEarlyCheckIn(
            id,
            approved,
            userId,
            rejectionReason
        );

        // Audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: approved ? 'EARLY_CHECKIN_APPROVED' : 'EARLY_CHECKIN_DENIED',
            entity: 'booking',
            entityId: id,
            metadata: {
                approved,
                rejectionReason,
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
        if (message === 'NO_EARLY_CHECKIN_REQUEST') {
            return badRequest('No early check-in request found', 'NO_EARLY_CHECKIN_REQUEST');
        }
        console.error('[EARLY_CHECKIN_APPROVE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
