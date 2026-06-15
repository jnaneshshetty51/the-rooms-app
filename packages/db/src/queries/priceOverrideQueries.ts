// packages/db/src/queries/priceOverrideQueries.ts
// Query helpers for Price Override Requests

import prisma from '../index';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreatePriceOverrideData = {
    bookingId?: string;
    roomId?: string;
    originalPrice: number;
    overriddenPrice: number;
    reason: string;
    requestedById: string;
    effectiveFrom?: Date;
    effectiveUntil?: Date;
};

export type ApprovePriceOverrideData = {
    approvedById: string;
    finalOverriddenPrice?: number;
    notes?: string;
};

export type RejectPriceOverrideData = {
    rejectedById: string;
    rejectionReason?: string;
};

// ─── Create Price Override Request ────────────────────────────────────────────

/**
 * Create a new price override request
 */
export async function createPriceOverrideRequest(data: CreatePriceOverrideData) {
    // Validate that either bookingId or roomId is provided
    if (!data.bookingId && !data.roomId) {
        throw new Error('Either bookingId or roomId must be provided');
    }

    // If bookingId is provided, validate it exists
    if (data.bookingId) {
        const booking = await prisma.booking.findUnique({
            where: { id: data.bookingId },
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
            throw new Error('Can only request price overrides for confirmed or checked-in bookings');
        }
    }

    // If roomId is provided, validate it exists
    if (data.roomId) {
        const room = await prisma.room.findUnique({
            where: { id: data.roomId },
        });

        if (!room) {
            throw new Error('Room not found');
        }
    }

    // Check if there's already a pending request for the same booking/room
    const whereClause: Prisma.PriceOverrideWhereInput = {
        status: 'PENDING',
    };

    if (data.bookingId) {
        whereClause.bookingId = data.bookingId;
    }
    if (data.roomId) {
        whereClause.roomId = data.roomId;
    }

    const existingRequest = await prisma.priceOverride.findFirst({
        where: whereClause,
    });

    if (existingRequest) {
        throw new Error('There is already a pending price override request for this booking/room');
    }

    return prisma.priceOverride.create({
        data: {
            bookingId: data.bookingId,
            roomId: data.roomId,
            originalPrice: new Decimal(data.originalPrice),
            overriddenPrice: new Decimal(data.overriddenPrice),
            reason: data.reason,
            requestedById: data.requestedById,
            effectiveFrom: data.effectiveFrom,
            effectiveUntil: data.effectiveUntil,
            status: 'PENDING',
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
            room: true,
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

// ─── Approve Price Override ───────────────────────────────────────────────────

/**
 * Approve a price override request
 */
export async function approvePriceOverride(
    id: string,
    data: ApprovePriceOverrideData
) {
    const request = await prisma.priceOverride.findUnique({
        where: { id },
        include: {
            booking: true,
            room: true,
        },
    });

    if (!request) {
        throw new Error('Price override request not found');
    }

    if (request.status !== 'PENDING') {
        throw new Error(`Request is not pending. Current status: ${request.status}`);
    }

    // Use the final overridden price if provided, otherwise use requested
    const finalOverriddenPrice = data.finalOverriddenPrice ?? request.overriddenPrice.toNumber();

    // Update the request
    const updatedRequest = await prisma.priceOverride.update({
        where: { id },
        data: {
            status: 'APPROVED',
            approvedById: data.approvedById,
            overriddenPrice: new Decimal(finalOverriddenPrice),
            reason: data.notes || request.reason,
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
            room: true,
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    // If this override is for a booking, apply it to the booking's total
    if (request.bookingId && request.booking) {
        const booking = request.booking;
        const priceDifference = finalOverriddenPrice - request.originalPrice.toNumber();

        await prisma.booking.update({
            where: { id: request.bookingId },
            data: {
                totalAmount: new Decimal(booking.totalAmount.toNumber() + priceDifference),
            },
        });
    }

    return updatedRequest;
}

// ─── Reject Price Override ────────────────────────────────────────────────────

/**
 * Reject a price override request
 */
export async function rejectPriceOverride(
    id: string,
    data: RejectPriceOverrideData
) {
    const request = await prisma.priceOverride.findUnique({
        where: { id },
    });

    if (!request) {
        throw new Error('Price override request not found');
    }

    if (request.status !== 'PENDING') {
        throw new Error(`Request is not pending. Current status: ${request.status}`);
    }

    return prisma.priceOverride.update({
        where: { id },
        data: {
            status: 'REJECTED',
            approvedById: data.rejectedById,
            reason: data.rejectionReason,
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
            room: true,
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

// ─── Apply Price Override ────────────────────────────────────────────────────

/**
 * Mark a price override as applied (when it's been used in billing)
 */
export async function applyPriceOverride(id: string) {
    const request = await prisma.priceOverride.findUnique({
        where: { id },
    });

    if (!request) {
        throw new Error('Price override request not found');
    }

    if (request.status !== 'APPROVED') {
        throw new Error(`Only approved price overrides can be marked as applied. Current status: ${request.status}`);
    }

    return prisma.priceOverride.update({
        where: { id },
        data: {
            status: 'APPLIED',
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
            room: true,
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

// ─── Get Pending Price Overrides ──────────────────────────────────────────────

/**
 * Get all pending price override requests
 */
export async function getPendingPriceOverrides(options?: {
    limit?: number;
    offset?: number;
}) {
    const { limit = 50, offset = 0 } = options || {};

    const [requests, total] = await Promise.all([
        prisma.priceOverride.findMany({
            where: { status: 'PENDING' },
            include: {
                booking: {
                    include: {
                        guest: true,
                        room: true,
                    },
                },
                room: true,
                requestedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.priceOverride.count({
            where: { status: 'PENDING' },
        }),
    ]);

    return {
        requests,
        total,
        hasMore: offset + requests.length < total,
    };
}

// ─── Get Active Price Override ────────────────────────────────────────────────

/**
 * Get the current active price override for a booking or room
 */
export async function getActivePriceOverride(bookingId?: string, roomId?: string) {
    if (!bookingId && !roomId) {
        throw new Error('Either bookingId or roomId must be provided');
    }

    const now = new Date();

    const whereClause: Prisma.PriceOverrideWhereInput = {
        status: { in: ['APPROVED', 'APPLIED'] },
        effectiveFrom: { lte: now },
        OR: [
            { effectiveUntil: null },
            { effectiveUntil: { gte: now } },
        ],
    };

    if (bookingId) {
        whereClause.bookingId = bookingId;
    }
    if (roomId) {
        whereClause.roomId = roomId;
    }

    return prisma.priceOverride.findFirst({
        where: whereClause,
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
            room: true,
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}

// ─── Get Price Override By ID ────────────────────────────────────────────────

/**
 * Get a single price override request by ID
 */
export async function getPriceOverrideById(id: string) {
    return prisma.priceOverride.findUnique({
        where: { id },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
            room: true,
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

// ─── Get Price Overrides By Booking ──────────────────────────────────────────

/**
 * Get all price override requests for a booking
 */
export async function getPriceOverridesByBooking(bookingId: string) {
    return prisma.priceOverride.findMany({
        where: { bookingId },
        include: {
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
