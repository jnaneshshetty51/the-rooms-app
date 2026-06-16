// apps/front-office/src/app/api/seasonal-rates/[id]/route.ts
// Scenario 48: Update seasonal rate

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { updateSeasonalRate } from '@the-rooms/db/queries/seasonalPricingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const updateSeasonalRateSchema = z.object({
    name: z.string().min(1).optional(),
    seasonType: z.enum(['PEAK', 'OFF_PEAK', 'FESTIVE', 'MONSOON']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    adjustmentType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    adjustmentValue: z.number().optional(),
    roomTypes: z.array(z.enum(['STUDIO', 'PREMIUM'])).optional(),
    minNights: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
});

// ─── PATCH /api/seasonal-rates/[id] ─────────────────────────────────────────────

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateSeasonalRateSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id?: string }).id;

        const updateData: any = { ...parsed.data };
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

        const result = await updateSeasonalRate({
            id,
            ...updateData,
            updatedById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'UPDATE',
            entity: 'seasonal_rate',
            entityId: id,
            metadata: updateData,
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Seasonal rate updated',
            seasonalRate: result.seasonalRate,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[SEASONAL_RATES_PATCH]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
