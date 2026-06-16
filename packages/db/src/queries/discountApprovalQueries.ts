// packages/db/src/queries/discountApprovalQueries.ts
// Query helpers for Discount Approval Requests

import prisma from '../index';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateDiscountApprovalData = {
    bookingId: string;
    discountCodeId?: string;
    originalDiscountAmount?: number;
    requestedDiscountPercent: number;
    requestedById: string;
    reason?: string;
};

export type ApproveDiscountData = {
    approvedById: string;
    actualDiscountPercent?: number;
    notes?: string;
};

export type RejectDiscountData = {
    rejectedById: string;
    rejectionReason?: string;
};

// ─── Create Discount Approval Request ─────────────────────────────────────────

/**
 * Create a new discount approval request
 */
export async function createDiscountApprovalRequest(data: CreateDiscountApprovalData) {
    const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
        throw new Error('Can only request discounts for confirmed or checked-in bookings');
    }

    // Check if there's already a pending request for this booking
    const existingRequest = await prisma.discountApprovalRequest.findFirst({
        where: {
            bookingId: data.bookingId,
            status: 'PENDING',
        },
    });

    if (existingRequest) {
        throw new Error('There is already a pending discount approval request for this booking');
    }

    // Get the original discount amount from booking
    const originalDiscount = (data.originalDiscountAmount ?? booking.discountAmount?.toNumber() ?? 0);

    // Convert the discount amount to a percent based on room amount
    // This is an approximation since booking stores amount, not percent
    let originalDiscountPercent: number | undefined;
    if (originalDiscount > 0 && booking.baseAmount.toNumber() > 0) {
        originalDiscountPercent = (originalDiscount / booking.baseAmount.toNumber()) * 100;
    }

    return prisma.discountApprovalRequest.create({
        data: {
            bookingId: data.bookingId,
            discountCodeId: data.discountCodeId,
            originalDiscountPercent: originalDiscountPercent !== undefined ? new Decimal(originalDiscountPercent) : null,
            requestedDiscountPercent: new Decimal(data.requestedDiscountPercent),
            requestedById: data.requestedById,
            reason: data.reason,
            status: 'PENDING',
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

// ─── Approve Discount Request ─────────────────────────────────────────────────

/**
 * Approve a discount request and apply it to the booking
 */
export async function approveDiscountRequest(
    id: string,
    data: ApproveDiscountData
) {
    const request = await prisma.discountApprovalRequest.findUnique({
        where: { id },
        include: {
            booking: true,
            discountCode: true,
        },
    });

    if (!request) {
        throw new Error('Discount approval request not found');
    }

    if (request.status !== 'PENDING') {
        throw new Error(`Request is not pending. Current status: ${request.status}`);
    }

    // Use the actual discount percent if provided, otherwise use requested
    const finalDiscountPercent = data.actualDiscountPercent ?? request.requestedDiscountPercent.toNumber();

    // Update the request
    const updatedRequest = await prisma.discountApprovalRequest.update({
        where: { id },
        data: {
            status: 'APPROVED',
            approvedById: data.approvedById,
            requestedDiscountPercent: new Decimal(finalDiscountPercent),
            reason: data.notes || request.reason,
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    // Calculate the discount amount and update booking
    const booking = request.booking;
    const roomAmount = booking.baseAmount.toNumber();
    const discountMultiplier = finalDiscountPercent / 100;
    const newDiscountAmount = roomAmount * discountMultiplier;

    await prisma.booking.update({
        where: { id: request.bookingId },
        data: {
            discountAmount: new Decimal(newDiscountAmount),
            totalAmount: new Decimal(roomAmount - newDiscountAmount + (booking.extrasAmount?.toNumber() || 0)),
        },
    });

    return updatedRequest;
}

// ─── Reject Discount Request ──────────────────────────────────────────────────

/**
 * Reject a discount request
 */
export async function rejectDiscountRequest(
    id: string,
    data: RejectDiscountData
) {
    const request = await prisma.discountApprovalRequest.findUnique({
        where: { id },
    });

    if (!request) {
        throw new Error('Discount approval request not found');
    }

    if (request.status !== 'PENDING') {
        throw new Error(`Request is not pending. Current status: ${request.status}`);
    }

    return prisma.discountApprovalRequest.update({
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
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

// ─── Get Pending Discount Requests ───────────────────────────────────────────

/**
 * Get all pending discount approval requests
 */
export async function getPendingDiscountRequests(options?: {
    limit?: number;
    offset?: number;
}) {
    const { limit = 50, offset = 0 } = options || {};

    const [requests, total] = await Promise.all([
        prisma.discountApprovalRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                booking: {
                    include: {
                        guest: true,
                        room: true,
                    },
                },
                requestedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.discountApprovalRequest.count({
            where: { status: 'PENDING' },
        }),
    ]);

    return {
        requests,
        total,
        hasMore: offset + requests.length < total,
    };
}

// ─── Get Discount Requests By Booking ─────────────────────────────────────────

/**
 * Get all discount approval requests for a booking
 */
export async function getDiscountRequestsByBooking(bookingId: string) {
    return prisma.discountApprovalRequest.findMany({
        where: { bookingId },
        include: {
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
            discountCode: true,
        },
        orderBy: { createdAt: 'desc' },
    });
}

// ─── Get Discount Request By ID ───────────────────────────────────────────────

/**
 * Get a single discount approval request by ID
 */
export async function getDiscountRequestById(id: string) {
    return prisma.discountApprovalRequest.findUnique({
        where: { id },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
            requestedBy: {
                select: { id: true, name: true, email: true },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
            discountCode: true,
        },
    });
}
