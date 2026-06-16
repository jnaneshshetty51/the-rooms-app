// apps/front-office/src/app/api/inventory/room-types/route.ts
// Scenario 47: Get room type inventory

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { z } from 'zod';
import { getRoomTypeInventory } from '@the-rooms/db/queries/inventoryQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const getInventorySchema = z.object({
    roomType: z.enum(['STUDIO', 'PREMIUM']),
    startDate: z.string(),
    endDate: z.string(),
    propertyId: z.string().optional().default('default'),
});

// ─── GET /api/inventory/room-types ─────────────────────────────────────────────
// Get inventory for a room type over a date range

export async function GET(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { searchParams } = new URL(request.url);
        const roomType = searchParams.get('roomType') as 'STUDIO' | 'PREMIUM';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const propertyId = searchParams.get('propertyId') || 'default';

        if (!roomType || !startDate || !endDate) {
            return badRequest('roomType, startDate, and endDate are required', 'MISSING_PARAMS');
        }

        const parsed = getInventorySchema.safeParse({ roomType, startDate, endDate, propertyId });
        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const result = await getRoomTypeInventory({
            propertyId: parsed.data.propertyId,
            roomType: parsed.data.roomType,
            startDate: new Date(parsed.data.startDate),
            endDate: new Date(parsed.data.endDate),
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
        console.error('[INVENTORY_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
