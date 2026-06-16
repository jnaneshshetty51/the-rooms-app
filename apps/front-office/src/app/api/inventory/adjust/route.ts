// apps/front-office/src/app/api/inventory/adjust/route.ts
// Scenario 47: Adjust room type inventory

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { adjustRoomTypeInventory } from '@the-rooms/db/queries/inventoryQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const adjustInventorySchema = z.object({
    roomType: z.enum(['STUDIO', 'PREMIUM']),
    date: z.string(),
    adjustment: z.number().int(),
    reason: z.enum(['BLOCK', 'RELEASE', 'MANUAL_ADJUSTMENT', 'MAINTENANCE', 'OTA_SYNC']),
    notes: z.string().optional(),
    propertyId: z.string().optional().default('default'),
});

// ─── POST /api/inventory/adjust ────────────────────────────────────────────────
// Adjust room type inventory

export async function POST(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const body = await request.json();
        const parsed = adjustInventorySchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { roomType, date, adjustment, reason, notes, propertyId } = parsed.data;
        const userId = (session.user as { id: string }).id;

        const result = await adjustRoomTypeInventory({
            propertyId,
            roomType,
            date: new Date(date),
            adjustment,
            reason,
            notes,
            adjustedById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'INVENTORY_ADJUSTED',
            entity: 'room',
            entityId: roomType,
            metadata: {
                roomType,
                date,
                adjustment,
                reason,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Inventory adjusted',
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
        console.error('[INVENTORY_ADJUST_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
