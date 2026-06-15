// apps/front-office/src/app/api/bookings/group/[groupId]/split/route.ts
// Split Group Booking into Different Room Types

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { Prisma } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { RoomType } from '@prisma/client';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const SplitGroupSchema = z.object({
    operations: z.array(z.object({
        type: z.enum(['REMOVE', 'ADD']),
        bookingId: z.string().optional(), // For REMOVE
        roomType: z.enum(['STUDIO', 'PREMIUM']).optional(), // For ADD
        count: z.number().int().min(1).optional(), // For ADD
    })).min(1, 'At least one operation is required'),
});

// ─── PATCH /api/bookings/group/[groupId]/split ────────────────────────────────
// Split group by adding/removing rooms of different types

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { groupId } = await params;
        const body = await request.json();
        const parsed = SplitGroupSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { operations } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if group exists
        const group = await db.groupBooking.findUnique({
            where: { id: groupId },
            include: { bookings: true },
        });

        if (!group) {
            return notFound('Group Booking', 'GROUP_NOT_FOUND');
        }

        if (group.status === 'CANCELLED' || group.status === 'COMPLETED') {
            return badRequest(
                'Cannot modify a cancelled or completed group booking',
                'INVALID_STATUS'
            );
        }

        const results = {
            removed: [] as string[],
            added: [] as string[],
            errors: [] as { operation: string; error: string }[],
        };

        // Process each operation
        for (const op of operations) {
            try {
                if (op.type === 'REMOVE') {
                    if (!op.bookingId) {
                        results.errors.push({
                            operation: 'REMOVE',
                            error: 'Booking ID is required for remove operation',
                        });
                        continue;
                    }

                    const booking = group.bookings.find(b => b.id === op.bookingId);
                    if (!booking) {
                        results.errors.push({
                            operation: 'REMOVE',
                            error: `Booking ${op.bookingId} not found in group`,
                        });
                        continue;
                    }

                    // Remove from group (unlink)
                    await db.booking.update({
                        where: { id: op.bookingId },
                        data: { groupBookingId: null },
                    });

                    // Release room hold
                    await db.roomHold.updateMany({
                        where: { bookingId: op.bookingId, status: 'ACTIVE' },
                        data: { status: 'RELEASED', releasedAt: new Date() },
                    });

                    results.removed.push(op.bookingId);
                } else if (op.type === 'ADD') {
                    if (!op.roomType || !op.count) {
                        results.errors.push({
                            operation: 'ADD',
                            error: 'Room type and count are required for add operation',
                        });
                        continue;
                    }

                    // Find available rooms
                    const availableRooms = await db.room.findMany({
                        where: {
                            type: op.roomType as RoomType,
                            status: 'VACANT',
                            propertyId: group.propertyId,
                            bookings: {
                                none: {
                                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                                    AND: [
                                        { checkIn: { lt: group.checkOutDate } },
                                        { checkOut: { gt: group.checkInDate } },
                                    ],
                                },
                            },
                        },
                        take: op.count,
                    });

                    if (availableRooms.length < op.count) {
                        results.errors.push({
                            operation: 'ADD',
                            error: `Room type ${op.roomType}: requested ${op.count}, available ${availableRooms.length}`,
                        });
                    }

                    // Create bookings for each available room
                    for (const room of availableRooms) {
                        const nights = Math.ceil(
                            (group.checkOutDate.getTime() - group.checkInDate.getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        const basePrice = room.basePriceDouble.toNumber();
                        const totalAmount = basePrice * nights;

                        // Create placeholder guest
                        const guest = await db.guest.create({
                            data: {
                                name: 'TBD',
                                phone: 'TBD',
                            },
                        });

                        // Generate booking number
                        const today = new Date();
                        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
                        const prefix = `BKN-${dateStr}-`;
                        const lastBooking = await db.booking.findFirst({
                            where: { bookingNumber: { startsWith: prefix } },
                            orderBy: { bookingNumber: 'desc' },
                            select: { bookingNumber: true },
                        });
                        let counter = 1;
                        if (lastBooking) {
                            const lastCounter = parseInt(
                                lastBooking.bookingNumber.split('-').pop() ?? '0',
                                10
                            );
                            counter = lastCounter + 1;
                        }
                        const bookingNumber = `${prefix}${String(counter).padStart(4, '0')}`;

                        // Create booking
                        const booking = await db.booking.create({
                            data: {
                                bookingNumber,
                                guestId: guest.id,
                                roomId: room.id,
                                propertyId: group.propertyId,
                                checkIn: group.checkInDate,
                                checkOut: group.checkOutDate,
                                guestsCount: 1,
                                bookingType: 'DAILY',
                                bookingSource: 'GROUP',
                                status: 'CONFIRMED',
                                paymentStatus: 'PENDING',
                                baseAmount: new Prisma.Decimal(basePrice),
                                totalAmount: new Prisma.Decimal(totalAmount),
                                groupBookingId: group.id,
                                createdById: userId,
                            },
                        });

                        // Create room hold
                        await db.roomHold.create({
                            data: {
                                roomId: room.id,
                                holdType: 'BOOKING',
                                bookingId: booking.id,
                                checkIn: group.checkInDate,
                                checkOut: group.checkOutDate,
                                expiresAt: new Date(
                                    group.checkInDate.getTime() - 4 * 60 * 60 * 1000
                                ),
                                status: 'ACTIVE',
                            },
                        });

                        results.added.push(booking.id);
                    }
                }
            } catch (error) {
                results.errors.push({
                    operation: op.type,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // Audit log
        await createAuditLog({
            userId,
            action: 'GROUP_SPLIT',
            entity: 'group_booking',
            entityId: groupId,
            metadata: {
                groupCode: group.groupCode,
                operations,
                results,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            groupId,
            groupCode: group.groupCode,
            results,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[GROUP_SPLIT]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
