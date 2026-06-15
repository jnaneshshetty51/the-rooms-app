// apps/front-office/src/app/api/bookings/group/[groupId]/rooms/route.ts
// Add Rooms to Group Booking

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound, created } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { addRoomToGroup } from '@the-rooms/db/queries/groupBookingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const AddRoomsSchema = z.object({
    rooms: z.array(z.object({
        roomType: z.enum(['STUDIO', 'PREMIUM']),
    })).min(1, 'At least one room is required'),
});

// ─── POST /api/bookings/group/[groupId]/rooms ───────────────────────────────────
// Add rooms to an existing group booking

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { groupId } = await params;
        const body = await request.json();
        const parsed = AddRoomsSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { rooms } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if group exists
        const group = await db.groupBooking.findUnique({
            where: { id: groupId },
        });

        if (!group) {
            return notFound('Group Booking', 'GROUP_NOT_FOUND');
        }

        if (group.status === 'CANCELLED' || group.status === 'COMPLETED') {
            return badRequest(
                'Cannot add rooms to a cancelled or completed group booking',
                'INVALID_STATUS'
            );
        }

        const addedBookings = [];
        const errors = [];

        // Add each room
        for (const roomReq of rooms) {
            try {
                const booking = await addRoomToGroup(groupId, roomReq.roomType, userId);
                addedBookings.push(booking);
            } catch (error) {
                errors.push({
                    roomType: roomReq.roomType,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // Audit log
        await createAuditLog({
            userId,
            action: 'GROUP_ROOMS_ADDED',
            entity: 'group_booking',
            entityId: groupId,
            metadata: {
                groupCode: group.groupCode,
                roomsAdded: addedBookings.length,
                errors: errors.length > 0 ? errors : undefined,
            },
            ipAddress: getClientIp(request),
        });

        return created({
            bookings: addedBookings,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[GROUP_ROOMS_ADD]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
