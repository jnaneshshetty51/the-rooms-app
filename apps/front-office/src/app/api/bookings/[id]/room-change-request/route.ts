// apps/front-office/src/app/api/bookings/[id]/room-change-request/route.ts
// Room Change Request Before Check-in

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { Prisma } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { RoomMoveReason } from '@prisma/client';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const RoomChangeRequestSchema = z.object({
    newRoomId: z.string().min(1, 'New room ID is required'),
    reason: z.enum(['UPGRADE', 'DOWNGRADE', 'MAINTENANCE', 'COMPLAINT', 'GUEST_REQUEST', 'SYSTEM_ERROR', 'OTHER']),
    notes: z.string().optional(),
});

// ─── POST /api/bookings/[id]/room-change-request ────────────────────────────────
// Request a room change before check-in

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = RoomChangeRequestSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { newRoomId, reason, notes } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Get current booking
        const booking = await db.booking.findUnique({
            where: { id },
            include: { room: true },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (booking.status !== 'CONFIRMED') {
            return badRequest(
                'Room changes can only be requested for confirmed bookings',
                'INVALID_STATUS'
            );
        }

        // Get new room
        const newRoom = await db.room.findUnique({
            where: { id: newRoomId },
        });

        if (!newRoom) {
            return notFound('Room', 'ROOM_NOT_FOUND');
        }

        if (newRoom.type !== booking.room.type) {
            return badRequest(
                'New room must be of the same room type',
                'ROOM_TYPE_MISMATCH'
            );
        }

        // Check new room availability
        const conflicting = await db.booking.findFirst({
            where: {
                roomId: newRoomId,
                id: { not: id },
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                OR: [
                    { checkIn: { lt: booking.checkOut }, checkOut: { gt: booking.checkIn } },
                ],
            },
        });

        if (conflicting) {
            return badRequest(
                'New room is not available for the booking dates',
                'ROOM_NOT_AVAILABLE'
            );
        }

        // Calculate price difference
        const currentTotal = booking.totalAmount;
        const nights = Math.ceil(
            (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );
        const newRoomPrice = nights * newRoom.basePriceDouble.toNumber();
        const priceDiff = newRoomPrice - currentTotal.toNumber();

        // Release old room hold
        await db.roomHold.updateMany({
            where: { bookingId: id, status: 'ACTIVE' },
            data: { status: 'RELEASED', releasedAt: new Date() },
        });

        // Update booking with new room
        const updatedBooking = await db.booking.update({
            where: { id },
            data: {
                roomId: newRoomId,
                baseAmount: new Prisma.Decimal(newRoomPrice / nights),
                totalAmount: new Prisma.Decimal(newRoomPrice),
            },
        });

        // Create new room hold
        await db.roomHold.create({
            data: {
                roomId: newRoomId,
                holdType: 'BOOKING',
                bookingId: id,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                expiresAt: new Date(booking.checkIn.getTime() - 4 * 60 * 60 * 1000),
                status: 'ACTIVE',
            },
        });

        // Record room move history
        await db.roomMoveHistory.create({
            data: {
                bookingId: id,
                fromRoomId: booking.roomId,
                toRoomId: newRoomId,
                reason: reason as RoomMoveReason,
                priceDiff: priceDiff > 0 ? new Prisma.Decimal(priceDiff) : null,
                refundAmount: priceDiff < 0 ? new Prisma.Decimal(Math.abs(priceDiff)) : null,
                effectiveFrom: booking.checkIn,
                initiatedById: userId,
                notes: notes || `Room change from ${booking.room.roomNumber} to ${newRoom.roomNumber}`,
            },
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: 'ROOM_CHANGE_REQUEST',
            entity: 'booking',
            entityId: id,
            metadata: {
                fromRoom: booking.room.roomNumber,
                toRoom: newRoom.roomNumber,
                reason,
                priceDiff,
                requiresPayment: priceDiff > 0,
                requiresRefund: priceDiff < 0,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            booking: updatedBooking,
            priceDiff,
            requiresPayment: priceDiff > 0,
            requiresRefund: priceDiff < 0,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[ROOM_CHANGE_REQUEST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
