// apps/front-office/src/app/api/overbooking/check/route.ts
// Scenario 45: Check overbooking availability

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { z } from 'zod';
import { checkOverbooking } from '@the-rooms/db/queries/overbookingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const checkOverbookingSchema = z.object({
    roomType: z.enum(['STUDIO', 'PREMIUM']),
    date: z.string().datetime({ message: 'Invalid date format' }),
    propertyId: z.string().optional().default('default'),
});

// ─── GET /api/overbooking/check ────────────────────────────────────────────────
// Check overbooking availability for a room type on a date

export async function GET(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { searchParams } = new URL(request.url);
        const roomType = searchParams.get('roomType') as 'STUDIO' | 'PREMIUM';
        const dateStr = searchParams.get('date');
        const propertyId = searchParams.get('propertyId') || 'default';

        if (!roomType || !dateStr) {
            return badRequest('roomType and date are required', 'MISSING_PARAMS');
        }

        const parsed = checkOverbookingSchema.safeParse({ roomType, date: dateStr, propertyId });
        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const result = await checkOverbooking(
            parsed.data.roomType,
            new Date(parsed.data.date),
            parsed.data.propertyId
        );

        return ok(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[OVERBOOKING_CHECK_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
