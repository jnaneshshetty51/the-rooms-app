// apps/front-office/src/app/api/maintenance/route.ts
// Scenario 43: Report maintenance

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { reportMaintenance } from '@the-rooms/db/queries/maintenanceQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'HOUSEKEEPING', 'MAINTENANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const reportMaintenanceSchema = z.object({
    roomId: z.string().min(1, 'Room ID is required'),
    type: z.enum(['PLUMBING', 'ELECTRICAL', 'FURNITURE', 'HVAC', 'OTHER']),
    issue: z.string().min(1, 'Issue description is required'),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    estimatedCost: z.number().positive().optional(),
    scheduledDate: z.string().datetime().optional(),
});

// ─── POST /api/maintenance ──────────────────────────────────────────────────────
// Report a maintenance issue

export async function POST(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const body = await request.json();
        const parsed = reportMaintenanceSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { roomId, type, issue, description, priority, estimatedCost, scheduledDate } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check room exists
        const room = await db.room.findUnique({
            where: { id: roomId },
            select: { id: true, roomNumber: true },
        });

        if (!room) {
            return notFound('Room', 'ROOM_NOT_FOUND');
        }

        // Report maintenance
        const result = await reportMaintenance({
            roomId,
            type,
            issue,
            description,
            priority,
            estimatedCost,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
            reportedById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'MAINTENANCE_REPORTED',
            entity: 'room',
            entityId: roomId,
            metadata: {
                roomNumber: room.roomNumber,
                maintenanceId: result.maintenance.id,
                type,
                issue,
                priority,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Maintenance issue reported',
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
        console.error('[MAINTENANCE_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
