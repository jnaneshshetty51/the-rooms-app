// apps/front-office/src/app/api/inventory/room-types/[type]/route.ts
// Scenario 47: Set room type inventory

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { setRoomTypeInventory } from '@the-rooms/db/queries/inventoryQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const setInventorySchema = z.object({
    date: z.string(),
    count: z.number().int().min(0),
    reason: z.string().optional(),
    propertyId: z.string().optional().default('default'),
});

// ─── PUT /api/inventory/room-types/[type] ──────────────────────────────────────
// Set specific inventory count for a room type on a date

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ type: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { type: roomType } = await params;
        if (!['STUDIO', 'PREMIUM'].includes(roomType)) {
            return badRequest('Invalid room type', 'INVALID_ROOM_TYPE');
        }

        const body = await request.json();
        const parsed = setInventorySchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { date, count, reason, propertyId } = parsed.data;
        const userId = (session.user as { id: string }).id;

        const result = await setRoomTypeInventory({
            propertyId,
            roomType: roomType as 'STUDIO' | 'PREMIUM',
            date: new Date(date),
            count,
            reason,
            setById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'INVENTORY_SET',
            entity: 'room',
            entityId: roomType,
            metadata: {
                roomType,
                date,
                count,
                reason,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Inventory set',
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[INVENTORY_SET_PUT]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
