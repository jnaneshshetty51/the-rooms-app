import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * ─── Room Conflict Queries ───────────────────────────────────────────────────
 *
 * Functions for detecting and resolving double room allocation conflicts.
 * Scenario 72: Double room allocation conflict
 */

// ─── Check Availability ────────────────────────────────────────────────────────

/**
 * Check if a room is available for a date range
 */
export async function checkRoomAvailability(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string
) {
    const where: Prisma.BookingWhereInput = {
        roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
            {
                checkIn: { lt: checkOut },
                checkOut: { gt: checkIn },
            },
        ],
    };

    if (excludeBookingId) {
        where.id = { not: excludeBookingId };
    }

    const conflictingBookings = await prisma.booking.findMany({
        where,
        include: {
            guest: { select: { name: true, phone: true } },
            room: { select: { roomNumber: true } },
        },
    });

    return {
        isAvailable: conflictingBookings.length === 0,
        conflictingBookings,
    };
}

// ─── Detect Conflicts ─────────────────────────────────────────────────────────

/**
 * Detect room conflicts for a specific date
 */
export async function detectRoomConflicts(date: Date) {
    // Get all bookings that overlap with the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
        where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            checkIn: { lte: endOfDay },
            checkOut: { gt: startOfDay },
        },
        include: {
            room: { select: { id: true, roomNumber: true, type: true } },
            guest: { select: { name: true, phone: true } },
        },
        orderBy: [{ roomId: 'asc' }, { checkIn: 'asc' }],
    });

    // Group bookings by room
    const roomBookings: Record<string, typeof bookings> = {};
    for (const booking of bookings) {
        if (!roomBookings[booking.roomId]) {
            roomBookings[booking.roomId] = [];
        }
        roomBookings[booking.roomId].push(booking);
    }

    // Find conflicts (rooms with multiple bookings)
    const conflicts: Array<{
        roomId: string;
        roomNumber: string;
        roomType: string;
        bookings: typeof bookings;
    }> = [];

    for (const [roomId, roomBks] of Object.entries(roomBookings)) {
        if (roomBks.length > 1) {
            // Check if dates actually overlap
            for (let i = 0; i < roomBks.length - 1; i++) {
                for (let j = i + 1; j < roomBks.length; j++) {
                    const b1 = roomBks[i];
                    const b2 = roomBks[j];
                    if (b1.checkIn < b2.checkOut && b2.checkIn < b1.checkOut) {
                        conflicts.push({
                            roomId,
                            roomNumber: roomBks[i].room.roomNumber,
                            roomType: roomBks[i].room.type,
                            bookings: [b1, b2],
                        });
                    }
                }
            }
        }
    }

    return conflicts;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Get room conflicts for a date range
 */
export async function getRoomConflicts(options: {
    roomId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    perPage?: number;
} = {}) {
    const { roomId, startDate, endDate, page = 1, perPage = 20 } = options;

    const where: Prisma.RoomConflictWhereInput = {};
    if (roomId) where.roomId = roomId;
    if (startDate || endDate) {
        where.conflictDate = {};
        if (startDate) where.conflictDate.gte = startDate;
        if (endDate) where.conflictDate.lte = endDate;
    }

    const [conflicts, total] = await Promise.all([
        prisma.roomConflict.findMany({
            where,
            include: {
                room: { select: { id: true, roomNumber: true, type: true } },
                booking1: {
                    include: {
                        guest: { select: { name: true, phone: true } },
                    },
                },
                booking2: {
                    include: {
                        guest: { select: { name: true, phone: true } },
                    },
                },
            },
            orderBy: { conflictDate: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.roomConflict.count({ where }),
    ]);

    return { conflicts, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Get a single room conflict by ID
 */
export async function getRoomConflictById(conflictId: string) {
    return prisma.roomConflict.findUnique({
        where: { id: conflictId },
        include: {
            room: { select: { id: true, roomNumber: true, type: true } },
            booking1: {
                include: {
                    guest: { select: { name: true, phone: true } },
                    payments: true,
                },
            },
            booking2: {
                include: {
                    guest: { select: { name: true, phone: true } },
                    payments: true,
                },
            },
        },
    });
}

// ─── Resolve ─────────────────────────────────────────────────────────────────

/**
 * Resolve a room conflict
 */
export async function resolveRoomConflict(
    conflictId: string,
    resolution: 'MOVE_GUEST' | 'UPGRADE' | 'DOWNGRADE' | 'CANCEL' | 'RELOCATE',
    notes: string,
    resolvedById: string,
    alternativeRoomId?: string
) {
    const conflict = await prisma.roomConflict.update({
        where: { id: conflictId },
        data: {
            resolution: resolution as any,
            notes,
            resolvedAt: new Date(),
            resolvedById,
            alternativeRoomId,
        },
        include: {
            room: { select: { roomNumber: true } },
            booking1: { include: { guest: true } },
            booking2: { include: { guest: true } },
        },
    });

    // If resolved by moving guest to alternative room
    if (resolution === 'MOVE_GUEST' && alternativeRoomId) {
        // Move the later booking to the alternative room
        const earlierBooking = conflict.booking1.checkIn < conflict.booking2.checkIn
            ? conflict.booking1
            : conflict.booking2;
        const laterBooking = conflict.booking1.checkIn < conflict.booking2.checkIn
            ? conflict.booking2
            : conflict.booking1;

        await prisma.booking.update({
            where: { id: laterBooking.id },
            data: { roomId: alternativeRoomId },
        });

        // Create audit log for room move
        await prisma.auditLog.create({
            data: {
                userId: resolvedById,
                bookingId: laterBooking.id,
                action: 'ROOM_MOVE',
                entity: 'booking',
                entityId: laterBooking.id,
                metadata: {
                    fromRoomId: conflict.roomId,
                    toRoomId: alternativeRoomId,
                    reason: `Conflict resolution: ${resolution}`,
                    conflictId,
                },
            },
        });
    }

    // If resolved by cancellation
    if (resolution === 'CANCEL') {
        // Cancel the later booking
        const laterBooking = conflict.booking1.checkIn < conflict.booking2.checkIn
            ? conflict.booking2
            : conflict.booking1;

        await prisma.booking.update({
            where: { id: laterBooking.id },
            data: { status: 'CANCELLED' },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: resolvedById,
                bookingId: laterBooking.id,
                action: 'CANCELLED',
                entity: 'booking',
                entityId: laterBooking.id,
                metadata: {
                    reason: `Conflict resolution: ${resolution}`,
                    conflictId,
                },
            },
        });
    }

    return conflict;
}

// ─── Room Holds ────────────────────────────────────────────────────────────────

/**
 * Create a room hold (for priority bookings)
 */
export async function createRoomHold(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    reason: string,
    priority: number = 0,
    holdType: 'BOOKING' | 'PRE_ASSIGN' | 'WAITLIST' | 'HOUSEKEEPING' = 'BOOKING',
    bookingId?: string,
    waitlistId?: string
) {
    // Calculate expiry (default 24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return prisma.roomHold.create({
        data: {
            roomId,
            checkIn,
            checkOut,
            holdType: holdType as any,
            bookingId,
            waitlistId,
            expiresAt,
        },
        include: {
            room: { select: { roomNumber: true, type: true } },
        },
    });
}

/**
 * Release a room hold
 */
export async function releaseRoomHold(holdId: string) {
    return prisma.roomHold.update({
        where: { id: holdId },
        data: {
            status: 'RELEASED',
            releasedAt: new Date(),
        },
        include: {
            room: { select: { roomNumber: true } },
        },
    });
}

/**
 * Get active room holds for a room
 */
export async function getRoomHolds(roomId: string) {
    return prisma.roomHold.findMany({
        where: {
            roomId,
            status: 'ACTIVE',
            expiresAt: { gt: new Date() },
        },
        include: {
            room: { select: { roomNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}
