// apps/front-office/src/app/api/housekeeping/rooms/[id]/clean/route.ts
// Scenario 42: Housekeeping marks room clean

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { markRoomClean } from '@the-rooms/db/queries/housekeepingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireHousekeeping(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['HOUSEKEEPING', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const markCleanSchema = z.object({
    taskId: z.string().min(1, 'Task ID is required'),
    notes: z.string().optional(),
    checklistResults: z.record(z.boolean()).optional(),
    photos: z.array(z.string()).optional(),
    issues: z.string().optional(),
});

// ─── POST /api/housekeeping/rooms/[id]/clean ────────────────────────────────
// Mark a room as clean after housekeeping

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireHousekeeping(session);

        const { id: roomId } = await params;
        const body = await request.json();
        const parsed = markCleanSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { taskId, notes, checklistResults, photos, issues } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check room exists
        const room = await db.room.findUnique({
            where: { id: roomId },
            select: { id: true, roomNumber: true, status: true },
        });

        if (!room) {
            return notFound('Room', 'ROOM_NOT_FOUND');
        }

        // Mark room clean
        const result = await markRoomClean({
            roomId,
            taskId,
            staffId: userId!,
            options: {
                notes,
                checklistResults,
                photos,
                issues,
            },
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'ROOM_MARKED_CLEAN',
            entity: 'room',
            entityId: roomId,
            metadata: {
                roomNumber: room.roomNumber,
                taskId,
                hasIssues: !!issues,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Room marked as clean',
            room: result.room,
            task: result.task,
            inspection: result.inspection,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[MARK_CLEAN_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
