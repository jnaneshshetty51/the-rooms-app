// apps/admin/src/app/api/settings/room-assignment/route.ts
// Room Assignment Policy Settings

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role || '')) {
        throw new Error('Forbidden');
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AssignmentPolicy = {
    defaultPolicy: 'PRE_ASSIGNED' | 'AUTO_ASSIGN';
    byBookingSource: {
        WALK_IN: 'PRE_ASSIGNED' | 'AUTO_ASSIGN';
        PHONE: 'PRE_ASSIGNED' | 'AUTO_ASSIGN';
        WEBSITE: 'AUTO_ASSIGN';
        OTA: 'PRE_ASSIGNED';
        CORPORATE: 'AUTO_ASSIGN';
        GROUP: 'AUTO_ASSIGN';
        COMPLIMENTARY: 'AUTO_ASSIGN';
    };
    preAssignmentCutoffHours: number;
    autoAssignmentEnabled: boolean;
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

const UpdateRoomAssignmentSchema = z.object({
    defaultPolicy: z.enum(['PRE_ASSIGNED', 'AUTO_ASSIGN']).optional(),
    byBookingSource: z.object({
        WALK_IN: z.enum(['PRE_ASSIGNED', 'AUTO_ASSIGN']).optional(),
        PHONE: z.enum(['PRE_ASSIGNED', 'AUTO_ASSIGN']).optional(),
        WEBSITE: z.enum(['PRE_ASSIGNED', 'AUTO_ASSIGN']).optional(),
        OTA: z.enum(['PRE_ASSIGNED', 'AUTO_ASSIGN']).optional(),
        CORPORATE: z.enum(['PRE_ASSIGNED', 'AUTO_ASSIGN']).optional(),
        GROUP: z.enum(['PRE_ASSIGNED', 'AUTO_ASSIGN']).optional(),
        COMPLIMENTARY: z.enum(['PRE_ASSIGNED', 'AUTO_ASSIGN']).optional(),
    }).optional(),
    preAssignmentCutoffHours: z.number().int().min(1).max(72).optional(),
    autoAssignmentEnabled: z.boolean().optional(),
});

// ─── GET /api/settings/room-assignment ─────────────────────────────────────
// Get room assignment policy settings

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId') || 'default';

        // Get settings from HotelSettings or use defaults
        const settings = await db.hotelSettings.findUnique({
            where: { id: propertyId },
        });

        // Return default policy if no settings exist
        const policy: AssignmentPolicy = {
            defaultPolicy: (settings as any)?.defaultRoomAssignment || 'AUTO_ASSIGN',
            byBookingSource: {
                WALK_IN: 'PRE_ASSIGNED',
                PHONE: 'PRE_ASSIGNED',
                WEBSITE: 'AUTO_ASSIGN',
                OTA: 'PRE_ASSIGNED',
                CORPORATE: 'AUTO_ASSIGN',
                GROUP: 'AUTO_ASSIGN',
                COMPLIMENTARY: 'AUTO_ASSIGN',
            },
            preAssignmentCutoffHours: settings?.preAssignmentCutoffHours || 4,
            autoAssignmentEnabled: settings?.autoAssignmentEnabled ?? true,
        };

        return ok(policy);
    } catch (error) {
        console.error('[ROOM_ASSIGNMENT_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/settings/room-assignment ─────────────────────────────────────
// Update room assignment policy settings

export async function PATCH(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const body = await request.json();
        const parsed = UpdateRoomAssignmentSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const data = parsed.data;
        const userId = (session.user as { id?: string }).id;
        const propertyId = 'default';

        // Update hotel settings
        const updateData: any = {};
        if (data.defaultPolicy) updateData.defaultRoomAssignment = data.defaultPolicy;
        if (data.preAssignmentCutoffHours) updateData.preAssignmentCutoffHours = data.preAssignmentCutoffHours;
        if (data.autoAssignmentEnabled !== undefined) updateData.autoAssignmentEnabled = data.autoAssignmentEnabled;

        const updated = await db.hotelSettings.upsert({
            where: { id: propertyId },
            create: {
                id: propertyId,
                ...updateData,
            },
            update: updateData,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'ROOM_ASSIGNMENT_SETTINGS_UPDATED',
            entity: 'settings',
            entityId: propertyId,
            metadata: {
                updatedFields: Object.keys(data),
            },
            ipAddress: getClientIp(request),
        });

        return ok({ settings: updated });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[ROOM_ASSIGNMENT_UPDATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
