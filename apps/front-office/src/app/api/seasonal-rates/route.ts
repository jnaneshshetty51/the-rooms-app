// apps/front-office/src/app/api/seasonal-rates/route.ts
// Scenario 48: Seasonal pricing management

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { createSeasonalRate, getSeasonalRates } from '@the-rooms/db/queries/seasonalPricingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createSeasonalRateSchema = z.object({
    propertyId: z.string().optional().default('default'),
    name: z.string().min(1, 'Name is required'),
    seasonType: z.enum(['PEAK', 'OFF_PEAK', 'FESTIVE', 'MONSOON']),
    startDate: z.string(),
    endDate: z.string(),
    adjustmentType: z.enum(['PERCENTAGE', 'FIXED']),
    adjustmentValue: z.number(),
    roomTypes: z.array(z.enum(['STUDIO', 'PREMIUM'])).optional(),
    minNights: z.number().int().min(1).optional().default(1),
    isActive: z.boolean().optional().default(true),
});

// ─── GET /api/seasonal-rates ────────────────────────────────────────────────────

export async function GET(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId') || 'default';
        const roomType = searchParams.get('roomType') as 'STUDIO' | 'PREMIUM' | undefined;
        const date = searchParams.get('date');
        const activeOnly = searchParams.get('activeOnly') !== 'false';

        const result = await getSeasonalRates({
            propertyId,
            roomType,
            date: date ? new Date(date) : undefined,
            activeOnly,
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
        console.error('[SEASONAL_RATES_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/seasonal-rates ──────────────────────────────────────────────────

export async function POST(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const body = await request.json();
        const parsed = createSeasonalRateSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id: string }).id;

        const result = await createSeasonalRate({
            ...parsed.data,
            startDate: new Date(parsed.data.startDate),
            endDate: new Date(parsed.data.endDate),
            createdById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'CREATE',
            entity: 'seasonal_rate',
            entityId: result.seasonalRate.id,
            metadata: {
                name: parsed.data.name,
                seasonType: parsed.data.seasonType,
                adjustmentType: parsed.data.adjustmentType,
                adjustmentValue: parsed.data.adjustmentValue,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Seasonal rate created',
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
        console.error('[SEASONAL_RATES_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
