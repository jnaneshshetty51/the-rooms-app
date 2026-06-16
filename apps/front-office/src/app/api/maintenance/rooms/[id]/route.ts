// apps/front-office/src/app/api/maintenance/rooms/[id]/route.ts
// Scenario 43: Get room maintenance history

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, serverError, notFound } from '@the-rooms/api';
import { getRoomMaintenanceHistory } from '@the-rooms/db/queries/maintenanceQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'HOUSEKEEPING', 'MAINTENANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── GET /api/maintenance/rooms/[id] ───────────────────────────────────────────
// Get maintenance history for a room

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id: roomId } = await params;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = parseInt(searchParams.get('perPage') || '20');

        // Check room exists
        const room = await db.room.findUnique({
            where: { id: roomId },
            select: { id: true, roomNumber: true },
        });

        if (!room) {
            return notFound('Room', 'ROOM_NOT_FOUND');
        }

        // Get maintenance history
        const result = await getRoomMaintenanceHistory({
            roomId,
            options: {
                status: status as any,
                page,
                perPage,
            },
        });

        return ok({
            room: {
                id: room.id,
                roomNumber: room.roomNumber,
            },
            maintenance: result.maintenance,
            pagination: {
                total: result.total,
                pages: result.pages,
                page: result.page,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[MAINTENANCE_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
