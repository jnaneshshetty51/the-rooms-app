import prisma from '../index';
import { RoomMoveReason } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * ─── Room Move History Queries ───────────────────────────────────────────────
 *
 * Functions for tracking room moves/changes during a booking.
 * Records audit trail when guests change rooms (upgrade, downgrade, maintenance, etc.)
 */

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Record a room move
 */
export async function recordRoomMove(
    bookingId: string,
    fromRoomId: string,
    toRoomId: string,
    reason: RoomMoveReason,
    initiatedById: string | null,
    options: {
        priceDiff?: Decimal | number;
        refundAmount?: Decimal | number;
        effectiveFrom?: Date;
        notes?: string;
    } = {}
) {
    const {
        priceDiff,
        refundAmount,
        effectiveFrom = new Date(),
        notes,
    } = options;

    return prisma.roomMoveHistory.create({
        data: {
            bookingId,
            fromRoomId,
            toRoomId,
            reason,
            priceDiff: priceDiff ? new Decimal(priceDiff.toString()) : undefined,
            refundAmount: refundAmount ? new Decimal(refundAmount.toString()) : undefined,
            effectiveFrom,
            initiatedById,
            notes,
        },
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true } },
                },
            },
            fromRoom: { select: { id: true, roomNumber: true, type: true } },
            toRoom: { select: { id: true, roomNumber: true, type: true } },
            initiatedBy: { select: { id: true, name: true } },
        },
    });
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Get room move history for a booking
 */
export async function getRoomMovesByBooking(bookingId: string) {
    return prisma.roomMoveHistory.findMany({
        where: { bookingId },
        include: {
            fromRoom: { select: { id: true, roomNumber: true, type: true } },
            toRoom: { select: { id: true, roomNumber: true, type: true } },
            initiatedBy: { select: { id: true, name: true } },
        },
        orderBy: { movedAt: 'desc' },
    });
}

/**
 * Get room move history for a specific room
 */
export async function getRoomMoveHistory(roomId: string, options: {
    direction?: 'from' | 'to' | 'both';
    startDate?: Date;
    endDate?: Date;
    page?: number;
    perPage?: number;
} = {}) {
    const { direction = 'both', startDate, endDate, page = 1, perPage = 20 } = options;

    let where: any = {};

    if (direction === 'from') {
        where.fromRoomId = roomId;
    } else if (direction === 'to') {
        where.toRoomId = roomId;
    } else {
        where.OR = [{ fromRoomId: roomId }, { toRoomId: roomId }];
    }

    if (startDate || endDate) {
        where.movedAt = {};
        if (startDate) where.movedAt.gte = startDate;
        if (endDate) where.movedAt.lte = endDate;
    }

    const [moves, total] = await Promise.all([
        prisma.roomMoveHistory.findMany({
            where,
            include: {
                booking: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        guest: { select: { name: true } },
                    },
                },
                fromRoom: { select: { id: true, roomNumber: true } },
                toRoom: { select: { id: true, roomNumber: true } },
                initiatedBy: { select: { id: true, name: true } },
            },
            orderBy: { movedAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.roomMoveHistory.count({ where }),
    ]);

    return { moves, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Get recent room moves across all bookings
 */
export async function getRecentRoomMoves(limit: number = 50) {
    return prisma.roomMoveHistory.findMany({
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true } },
                },
            },
            fromRoom: { select: { id: true, roomNumber: true } },
            toRoom: { select: { id: true, roomNumber: true } },
            initiatedBy: { select: { id: true, name: true } },
        },
        orderBy: { movedAt: 'desc' },
        take: limit,
    });
}

/**
 * Get room move statistics
 */
export async function getRoomMoveStats(propertyId: string = 'default', startDate?: Date, endDate?: Date) {
    const where: any = {
        booking: { propertyId },
    };

    if (startDate || endDate) {
        where.movedAt = {};
        if (startDate) where.movedAt.gte = startDate;
        if (endDate) where.movedAt.lte = endDate;
    }

    const [total, byReason, byRoom] = await Promise.all([
        prisma.roomMoveHistory.count({ where }),
        prisma.roomMoveHistory.groupBy({
            by: ['reason'],
            where,
            _count: true,
        }),
        prisma.roomMoveHistory.groupBy({
            by: ['toRoomId'],
            where,
            _count: true,
            orderBy: { _count: { toRoomId: 'desc' } },
            take: 10,
        }),
    ]);

    return {
        total,
        byReason: byReason.map(r => ({ reason: r.reason, count: r._count })),
        topRooms: byRoom,
    };
}

// ─── Room Swap Detection ───────────────────────────────────────────────────────

/**
 * Detect if two rooms were swapped (mutual move)
 * Returns the swap pair if detected
 */
export async function detectRoomSwap(roomAId: string, roomBId: string, withinHours: number = 1) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - withinHours);

    const moves = await prisma.roomMoveHistory.findMany({
        where: {
            movedAt: { gte: cutoff },
            OR: [
                { fromRoomId: roomAId, toRoomId: roomBId },
                { fromRoomId: roomBId, toRoomId: roomAId },
            ],
        },
        orderBy: { movedAt: 'asc' },
    });

    if (moves.length !== 2) return null;

    // Check if it's a swap
    const move1 = moves[0];
    const move2 = moves[1];

    const isSwap = (
        move1.fromRoomId === roomAId && move1.toRoomId === roomBId &&
        move2.fromRoomId === roomBId && move2.toRoomId === roomAId
    ) || (
            move1.fromRoomId === roomBId && move1.toRoomId === roomAId &&
            move2.fromRoomId === roomAId && move2.toRoomId === roomBId
        );

    return isSwap ? moves : null;
}
