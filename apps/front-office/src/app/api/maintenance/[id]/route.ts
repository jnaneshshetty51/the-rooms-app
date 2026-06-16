// apps/front-office/src/app/api/maintenance/[id]/route.ts
// Scenario 44: Update maintenance status

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { updateMaintenanceStatus } from '@the-rooms/db/queries/maintenanceQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['MAINTENANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const updateMaintenanceSchema = z.object({
    status: z.enum(['REPORTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    resolution: z.string().optional(),
});

// ─── PATCH /api/maintenance/[id] ──────────────────────────────────────────────
// Update maintenance status

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id: maintenanceId } = await params;
        const body = await request.json();
        const parsed = updateMaintenanceSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { status, resolution } = parsed.data;
        const userId = (session.user as { id: string }).id;

        // Check maintenance exists
        const maintenance = await db.roomMaintenance.findUnique({
            where: { id: maintenanceId },
            include: { room: true },
        });

        if (!maintenance) {
            return notFound('Maintenance', 'MAINTENANCE_NOT_FOUND');
        }

        // Update status
        const result = await updateMaintenanceStatus({
            maintenanceId,
            status,
            resolution,
            resolvedBy: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'MAINTENANCE_STATUS_UPDATED',
            entity: 'room',
            entityId: maintenance.roomId,
            metadata: {
                maintenanceId,
                roomNumber: maintenance.room.roomNumber,
                previousStatus: maintenance.status,
                newStatus: status,
                resolution,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Maintenance status updated',
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
        console.error('[MAINTENANCE_PATCH]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
