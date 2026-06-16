// apps/front-office/src/app/api/bookings/[id]/late-arrival/route.ts
// Update Late Arrival Settings for a Booking

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { updateLateArrivalSettings } from '@the-rooms/db/queries/lateArrivalQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const updateLateArrivalSchema = z.object({
    autoCheckInEnabled: z.boolean().optional(),
    expectedArrivalTime: z.string().datetime().optional(),
});

// ─── PATCH /api/bookings/[id]/late-arrival ─────────────────────────────────────
// Update late arrival settings for a booking

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateLateArrivalSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { autoCheckInEnabled, expectedArrivalTime } = parsed.data;
        const userId = (session.user as { id: string }).id;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        const updated = await updateLateArrivalSettings(id, {
            autoCheckInEnabled,
            expectedArrivalTime: expectedArrivalTime ? new Date(expectedArrivalTime) : undefined,
        }, userId);

        // Audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: 'LATE_ARRIVAL_SETTINGS_UPDATED',
            entity: 'booking',
            entityId: id,
            metadata: {
                autoCheckInEnabled,
                expectedArrivalTime,
            },
            ipAddress: getClientIp(request),
        });

        return ok({ booking: updated });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[LATE_ARRIVAL_SETTINGS]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
