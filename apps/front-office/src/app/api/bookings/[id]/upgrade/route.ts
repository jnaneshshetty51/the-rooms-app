// apps/front-office/src/app/api/bookings/[id]/upgrade/route.ts
// Scenario 46: Process room upgrade

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { recordRoomMove } from '@the-rooms/db/queries/roomMoveQueries';
import { Decimal } from 'decimal.js';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const upgradeSchema = z.object({
    newRoomId: z.string().min(1, 'New room ID is required'),
    reason: z.string().optional().default('Guest requested upgrade'),
});

// ─── POST /api/bookings/[id]/upgrade ──────────────────────────────────────────────
// Process room upgrade

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id: bookingId } = await params;
        const body = await request.json();
        const parsed = upgradeSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { newRoomId, reason } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Get booking with current room
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: {
                room: true,
                guest: { select: { name: true } },
            },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (booking.status !== 'CHECKED_IN') {
            return badRequest('Booking is not checked in', 'INVALID_STATUS');
        }

        // Get new room
        const newRoom = await db.room.findUnique({
            where: { id: newRoomId },
        });

        if (!newRoom) {
            return notFound('Room', 'ROOM_NOT_FOUND');
        }

        // Check new room is vacant and clean
        if (newRoom.status !== 'VACANT') {
            return badRequest('New room is not available', 'ROOM_NOT_AVAILABLE');
        }

        if (newRoom.cleaningStatus !== 'CLEAN') {
            return badRequest('New room is not clean', 'ROOM_NOT_CLEAN');
        }

        // Calculate price difference
        const currentPrice = booking.room.type === 'STUDIO'
            ? booking.room.basePriceDouble?.toNumber() || booking.baseAmount.toNumber()
            : booking.room.basePriceDouble?.toNumber() || booking.baseAmount.toNumber();

        const newPrice = newRoom.type === 'STUDIO'
            ? newRoom.basePriceDouble?.toNumber() || 0
            : newRoom.basePriceDouble?.toNumber() || 0;

        const priceDiff = newPrice - currentPrice;

        // Process the upgrade in a transaction
        const result = await db.$transaction(async (tx) => {
            // Update booking with new room
            await tx.booking.update({
                where: { id: bookingId },
                data: { roomId: newRoomId },
            });

            // Update old room to vacant
            await tx.room.update({
                where: { id: booking.roomId },
                data: { status: 'VACANT' },
            });

            // Update new room to occupied
            await tx.room.update({
                where: { id: newRoomId },
                data: { status: 'OCCUPIED' },
            });

            // Record room move
            const roomMove = await tx.roomMoveHistory.create({
                data: {
                    bookingId,
                    fromRoomId: booking.roomId,
                    toRoomId: newRoomId,
                    reason: 'UPGRADE',
                    priceDiff: new Decimal(priceDiff),
                    effectiveFrom: new Date(),
                    initiatedById: userId,
                    notes: reason,
                },
            });

            return roomMove;
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId,
            action: 'ROOM_UPGRADED',
            entity: 'booking',
            entityId: bookingId,
            metadata: {
                fromRoomId: booking.roomId,
                fromRoomNumber: booking.room.roomNumber,
                toRoomId: newRoomId,
                toRoomNumber: newRoom.roomNumber,
                priceDiff,
                reason,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Room upgraded successfully',
            booking: {
                id: bookingId,
                bookingNumber: booking.bookingNumber,
                previousRoom: {
                    id: booking.roomId,
                    roomNumber: booking.room.roomNumber,
                },
                newRoom: {
                    id: newRoomId,
                    roomNumber: newRoom.roomNumber,
                },
                priceDifference: priceDiff,
            },
            roomMove: {
                id: result.id,
                reason: result.reason,
                priceDiff: result.priceDiff?.toNumber(),
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
        console.error('[UPGRADE_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
