// apps/front-office/src/app/api/bookings/group/[groupId]/rooms/[bookingId]/route.ts
// Remove a Room from Group Booking

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { removeRoomFromGroup } from '@the-rooms/db/queries/groupBookingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const RemoveRoomSchema = z.object({
    reason: z.string().optional(),
});

// ─── DELETE /api/bookings/group/[groupId]/rooms/[bookingId] ────────────────────
// Remove a specific booking/room from a group

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string; bookingId: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { groupId, bookingId } = await params;
        const userId = (session.user as { id: string }).id;

        // Check if group exists
        const group = await db.groupBooking.findUnique({
            where: { id: groupId },
        });

        if (!group) {
            return notFound('Group Booking', 'GROUP_NOT_FOUND');
        }

        // Check if booking exists and is part of this group
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (booking.groupBookingId !== groupId) {
            return badRequest(
                'Booking is not part of this group',
                'BOOKING_NOT_IN_GROUP'
            );
        }

        if (booking.status === 'CHECKED_IN') {
            return badRequest(
                'Cannot remove a checked-in booking from group',
                'BOOKING_CHECKED_IN'
            );
        }

        const { searchParams } = new URL(request.url);
        const reason = searchParams.get('reason') || 'Removed from group';

        const updatedBooking = await removeRoomFromGroup(bookingId, reason);

        // Audit log
        await createAuditLog({
            userId,
            bookingId,
            action: 'ROOM_REMOVED_FROM_GROUP',
            entity: 'booking',
            entityId: bookingId,
            metadata: {
                groupId,
                groupCode: group.groupCode,
                reason,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            booking: updatedBooking,
            message: 'Room removed from group. Booking will remain as individual booking.',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[GROUP_ROOM_REMOVE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
