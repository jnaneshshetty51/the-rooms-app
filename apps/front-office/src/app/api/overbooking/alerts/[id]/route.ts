// apps/front-office/src/app/api/overbooking/alerts/[id]/route.ts
// Scenario 45: Resolve overbooking alert

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { resolveOverbooking } from '@the-rooms/db/queries/overbookingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const resolveAlertSchema = z.object({
    resolution: z.enum(['UPGRADE_FREE', 'RELOCATE_PARTNER', 'RELOCATE_GUEST', 'CANCEL_REFUND', 'CANCEL_NO_REFUND']),
    actionTaken: z.string().min(1, 'Action taken description is required'),
    alternativeRoomId: z.string().optional(),
    partnerHotelId: z.string().optional(),
    refundAmount: z.number().min(0).optional(),
});

// ─── PATCH /api/overbooking/alerts/[id] ───────────────────────────────────────
// Resolve an overbooking alert

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id: alertId } = await params;
        const body = await request.json();
        const parsed = resolveAlertSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { resolution, actionTaken, alternativeRoomId, partnerHotelId, refundAmount } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        const result = await resolveOverbooking({
            alertId,
            resolution,
            actionTaken,
            alternativeRoomId,
            partnerHotelId,
            refundAmount,
            resolvedById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'OVERBOOKING_ALERT_RESOLVED',
            entity: 'alert',
            entityId: alertId,
            metadata: {
                resolution,
                actionTaken,
                alternativeRoomId,
                refundAmount,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Overbooking alert resolved',
            alert: result.alert,
            booking: result.booking,
            alternativeRoom: result.alternativeRoom,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[OVERBOOKING_ALERT_PATCH]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
