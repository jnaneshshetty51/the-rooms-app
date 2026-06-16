import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * ─── Dispute Queries ─────────────────────────────────────────────────────────
 *
 * Functions for managing guest billing disputes.
 * Scenario 70: Guest dispute on bill
 */

// ─── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new dispute for a booking
 */
export async function createDispute(
    bookingId: string,
    guestId: string,
    reason: string,
    disputedItems: Array<{ item: string; amount: number; expectedAmount: number }>,
    expectedAmount: number,
    disputedAmount: number,
    propertyId: string = 'default'
) {
    return prisma.dispute.create({
        data: {
            bookingId,
            guestId,
            reason,
            disputedItems: disputedItems as any,
            expectedAmount: new Prisma.Decimal(expectedAmount),
            disputedAmount: new Prisma.Decimal(disputedAmount),
            propertyId,
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: { select: { roomNumber: true, type: true } },
                },
            },
            guest: { select: { id: true, name: true, phone: true, email: true } },
        },
    });
}

// ─── Read ────────────────────────────────────────────────────────────────────────────

/**
 * Get dispute by ID
 */
export async function getDispute(disputeId: string) {
    return prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: { select: { roomNumber: true, type: true } },
                    payments: true,
                    invoice: true,
                },
            },
            guest: { select: { id: true, name: true, phone: true, email: true } },
            responses: {
                include: {
                    // respondedBy: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });
}

/**
 * Get all disputes for a booking
 */
export async function getBookingDisputes(bookingId: string) {
    return prisma.dispute.findMany({
        where: { bookingId },
        include: {
            guest: { select: { id: true, name: true, phone: true } },
            responses: {
                orderBy: { createdAt: 'asc' },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Get disputes with filters
 */
export async function getDisputes(options: {
    propertyId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    perPage?: number;
} = {}) {
    const { propertyId, status, startDate, endDate, page = 1, perPage = 20 } = options;

    const where: Prisma.DisputeWhereInput = {};
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status as any;
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const [disputes, total] = await Promise.all([
        prisma.dispute.findMany({
            where,
            include: {
                booking: {
                    include: {
                        guest: true,
                        room: { select: { roomNumber: true, type: true } },
                    },
                },
                guest: { select: { id: true, name: true, phone: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.dispute.count({ where }),
    ]);

    return { disputes, total, pages: Math.ceil(total / perPage), page };
}

// ─── Update ─────────────────────────────────────────────────────────────────────

/**
 * Add a response to a dispute
 */
export async function addDisputeResponse(
    disputeId: string,
    response: string,
    attachments: string[] = [],
    respondedById?: string
) {
    return prisma.disputeResponse.create({
        data: {
            disputeId,
            response,
            attachments,
            respondedById,
        },
        include: {
            dispute: true,
        },
    });
}

/**
 * Resolve a dispute
 */
export async function resolveDispute(
    disputeId: string,
    resolution: string,
    adjustmentAmount?: number,
    resolutionType?: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'ADJUSTMENT' | 'NO_ADJUSTMENT' | 'WAIVED'
) {
    return prisma.dispute.update({
        where: { id: disputeId },
        data: {
            status: 'RESOLVED',
            resolution,
            adjustmentAmount: adjustmentAmount !== undefined ? new Prisma.Decimal(adjustmentAmount) : undefined,
            resolutionType: resolutionType as any,
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: { select: { roomNumber: true } },
                },
            },
            guest: { select: { id: true, name: true } },
        },
    });
}

/**
 * Update dispute status
 */
export async function updateDisputeStatus(disputeId: string, status: string) {
    return prisma.dispute.update({
        where: { id: disputeId },
        data: { status: status as any },
        include: {
            booking: { include: { guest: true } },
            guest: { select: { id: true, name: true } },
        },
    });
}

// ─── Calculate ─────────────────────────────────────────────────────────────────

/**
 * Calculate recommended adjustment for a dispute
 */
export async function calculateDisputeAdjustment(disputeId: string) {
    const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
            booking: {
                include: {
                    invoice: {
                        include: { items: true },
                    },
                    payments: true,
                },
            },
        },
    });

    if (!dispute) {
        throw new Error('Dispute not found');
    }

    const disputedItems = dispute.disputedItems as Array<{
        item: string;
        amount: number;
        expectedAmount: number;
    }>;

    // Calculate the difference between expected and actual
    let totalExpected = 0;
    let totalActual = 0;

    for (const item of disputedItems) {
        totalExpected += item.expectedAmount;
        totalActual += item.amount;
    }

    const difference = totalActual - totalExpected;
    const percentageDiff = totalExpected > 0 ? (difference / totalExpected) * 100 : 0;

    // Determine recommendation based on difference
    let recommendation: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'ADJUSTMENT' | 'NO_ADJUSTMENT' | 'WAIVED';
    let recommendedAmount = 0;

    if (percentageDiff > 50) {
        recommendation = 'FULL_REFUND';
        recommendedAmount = totalActual;
    } else if (percentageDiff > 10) {
        recommendation = 'PARTIAL_REFUND';
        recommendedAmount = difference;
    } else if (percentageDiff > 0) {
        recommendation = 'ADJUSTMENT';
        recommendedAmount = difference;
    } else {
        recommendation = 'NO_ADJUSTMENT';
        recommendedAmount = 0;
    }

    return {
        disputeId,
        totalExpected,
        totalActual,
        difference,
        percentageDiff: Math.round(percentageDiff * 100) / 100,
        recommendation,
        recommendedAmount: Math.round(recommendedAmount * 100) / 100,
    };
}
