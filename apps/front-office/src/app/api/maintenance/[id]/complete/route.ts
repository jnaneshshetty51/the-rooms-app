// apps/front-office/src/app/api/maintenance/[id]/complete/route.ts
// Scenario 44: Complete maintenance

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { completeMaintenance } from '@the-rooms/db/queries/maintenanceQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['MAINTENANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const completeMaintenanceSchema = z.object({
    resolution: z.string().min(1, 'Resolution description is required'),
    actualCost: z.number().min(0).optional(),
});

// ─── POST /api/maintenance/[id]/complete ──────────────────────────────────────
// Complete maintenance

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id: maintenanceId } = await params;
        const body = await request.json();
        const parsed = completeMaintenanceSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { resolution, actualCost } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check maintenance exists
        const maintenance = await db.roomMaintenance.findUnique({
            where: { id: maintenanceId },
            include: { room: true },
        });

        if (!maintenance) {
            return notFound('Maintenance', 'MAINTENANCE_NOT_FOUND');
        }

        if (maintenance.status === 'COMPLETED') {
            return badRequest('Maintenance is already completed', 'ALREADY_COMPLETED');
        }

        // Complete maintenance
        const result = await completeMaintenance({
            maintenanceId,
            resolution,
            actualCost,
            resolvedBy: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'MAINTENANCE_COMPLETED',
            entity: 'room',
            entityId: maintenance.roomId,
            metadata: {
                maintenanceId,
                roomNumber: maintenance.room.roomNumber,
                resolution,
                actualCost,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Maintenance completed',
            maintenance: result.maintenance,
            room: result.room,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[MAINTENANCE_COMPLETE_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
