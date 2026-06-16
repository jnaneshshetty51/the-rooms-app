// apps/front-office/src/app/api/overbooking/alerts/route.ts
// Scenario 45: Create overbooking alert

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { createOverbookingAlert } from '@the-rooms/db/queries/overbookingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createAlertSchema = z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
    roomType: z.enum(['STUDIO', 'PREMIUM']),
    date: z.string().datetime({ message: 'Invalid date format' }),
    alternatives: z.array(z.string()).optional(),
    suggestedAction: z.enum(['UPGRADE_FREE', 'RELOCATE_PARTNER', 'RELOCATE_GUEST', 'CANCEL_REFUND', 'CANCEL_NO_REFUND']).optional(),
    notes: z.string().optional(),
});

// ─── POST /api/overbooking/alerts ───────────────────────────────────────────────
// Create an overbooking alert

export async function POST(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const body = await request.json();
        const parsed = createAlertSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { bookingId, roomType, date, alternatives, suggestedAction, notes } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        const result = await createOverbookingAlert({
            bookingId,
            roomTypeId: roomType,
            date: new Date(date),
            alternatives,
            suggestedAction,
            notes,
            createdById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId,
            action: 'OVERBOOKING_ALERT_CREATED',
            entity: 'booking',
            entityId: bookingId,
            metadata: {
                roomType,
                date,
                suggestedAction,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Overbooking alert created',
            alert: result.alert,
            booking: result.booking,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[OVERBOOKING_ALERT_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
