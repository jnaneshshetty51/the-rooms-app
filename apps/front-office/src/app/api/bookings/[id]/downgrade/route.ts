// apps/front-office/src/app/api/bookings/[id]/downgrade/route.ts
// Scenario 46: Process room downgrade

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db, Prisma } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const downgradeSchema = z.object({
    newRoomId: z.string().min(1, 'New room ID is required'),
    reason: z.string().optional().default('Guest requested downgrade'),
    refundAmount: z.number().min(0).optional().default(0),
});

// ─── POST /api/bookings/[id]/downgrade ──────────────────────────────────────────────
// Process room downgrade

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id: bookingId } = await params;
        const body = await request.json();
        const parsed = downgradeSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { newRoomId, reason, refundAmount } = parsed.data;
        const userId = (session.user as { id: string }).id;

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

        // Calculate price difference (negative = refund to guest)
        const currentPrice = booking.room.type === 'STUDIO'
            ? booking.room.basePriceDouble?.toNumber() || booking.baseAmount.toNumber()
            : booking.room.basePriceDouble?.toNumber() || booking.baseAmount.toNumber();

        const newPrice = newRoom.type === 'STUDIO'
            ? newRoom.basePriceDouble?.toNumber() || 0
            : newRoom.basePriceDouble?.toNumber() || 0;

        const priceDiff = newPrice - currentPrice;

        // Process the downgrade in a transaction
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
                    reason: 'DOWNGRADE',
                    priceDiff: new Prisma.Decimal(priceDiff),
                    refundAmount: new Prisma.Decimal(refundAmount),
                    effectiveFrom: new Date(),
                    initiatedById: userId,
                    notes: reason,
                },
            });

            // If there's a refund, create a refund record
            if (refundAmount > 0) {
                // Find original payment
                const originalPayment = await tx.payment.findFirst({
                    where: {
                        bookingId,
                        status: 'PAID',
                    },
                    orderBy: { createdAt: 'desc' },
                });

                if (originalPayment) {
                    await tx.payment.create({
                        data: {
                            bookingId,
                            amount: new Prisma.Decimal(refundAmount),
                            method: originalPayment.method,
                            status: 'PENDING',
                            refundReason: `Room downgrade refund: ${reason}`,
                            refundStatus: 'PENDING',
                        },
                    });
                }
            }

            return roomMove;
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId,
            action: 'ROOM_DOWNGRADED',
            entity: 'booking',
            entityId: bookingId,
            metadata: {
                fromRoomId: booking.roomId,
                fromRoomNumber: booking.room.roomNumber,
                toRoomId: newRoomId,
                toRoomNumber: newRoom.roomNumber,
                priceDiff,
                refundAmount,
                reason,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Room downgraded successfully',
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
                refundAmount,
            },
            roomMove: {
                id: result.id,
                reason: result.reason,
                priceDiff: result.priceDiff?.toNumber(),
                refundAmount: result.refundAmount?.toNumber(),
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
        console.error('[DOWNGRADE_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
