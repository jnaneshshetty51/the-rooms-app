// apps/front-office/src/app/api/blackout-dates/route.ts
// Scenario 50: Blackout dates management

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { createBlackoutDate, getBlackoutDates } from '@the-rooms/db/queries/blackoutQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createBlackoutDateSchema = z.object({
    propertyId: z.string().optional().default('default'),
    date: z.string(),
    endDate: z.string().optional(),
    reason: z.enum(['MAINTENANCE', 'PRIVATE_EVENT', 'FORCED_CLOSURE', 'OTHER']),
    description: z.string().optional(),
    roomType: z.enum(['STUDIO', 'PREMIUM']).optional(),
    bookingSource: z.enum(['WEBSITE', 'WALK_IN', 'PHONE', 'OTA', 'COMPLIMENTARY', 'CORPORATE', 'GROUP']).optional(),
});

// ─── GET /api/blackout-dates ────────────────────────────────────────────────────

export async function GET(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId') || 'default';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const roomType = searchParams.get('roomType') as 'STUDIO' | 'PREMIUM' | undefined;

        if (!startDate || !endDate) {
            return badRequest('startDate and endDate are required', 'MISSING_PARAMS');
        }

        const result = await getBlackoutDates({
            propertyId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            roomType,
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
        console.error('[BLACKOUT_DATES_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/blackout-dates ──────────────────────────────────────────────────

export async function POST(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const body = await request.json();
        const parsed = createBlackoutDateSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id: string }).id;

        const result = await createBlackoutDate({
            ...parsed.data,
            date: new Date(parsed.data.date),
            endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
            createdById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'CREATE',
            entity: 'blackout_date',
            entityId: result.blackoutDate.id,
            metadata: {
                date: parsed.data.date,
                endDate: parsed.data.endDate,
                reason: parsed.data.reason,
                roomType: parsed.data.roomType,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Blackout date created',
            blackoutDate: result.blackoutDate,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[BLACKOUT_DATES_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
