// apps/front-office/src/app/api/housekeeping/rooms/[id]/mark-dirty/route.ts
// Scenario 41: Room marked dirty after checkout

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { markRoomDirty } from '@the-rooms/db/queries/housekeepingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'HOUSEKEEPING', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const markDirtySchema = z.object({
    checkoutBookingId: z.string().optional(),
    notes: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
});

// ─── POST /api/housekeeping/rooms/[id]/mark-dirty ──────────────────────────────
// Mark a room as dirty after checkout

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id: roomId } = await params;
        const body = await request.json();
        const parsed = markDirtySchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { checkoutBookingId, notes, priority } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check room exists
        const room = await db.room.findUnique({
            where: { id: roomId },
            select: { id: true, roomNumber: true, status: true },
        });

        if (!room) {
            return notFound('Room', 'ROOM_NOT_FOUND');
        }

        // Mark room dirty
        const result = await markRoomDirty(roomId, checkoutBookingId, {
            priority,
            notes,
            reportedById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'ROOM_MARKED_DIRTY',
            entity: 'room',
            entityId: roomId,
            metadata: {
                roomNumber: room.roomNumber,
                checkoutBookingId,
                notes,
                priority,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Room marked as dirty',
            room: result.room,
            task: result.task,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[MARK_DIRTY_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
