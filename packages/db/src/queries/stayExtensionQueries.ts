// packages/db/src/queries/stayExtensionQueries.ts
// Query helpers for Stay Extension (EXTEND_STAY)

import prisma from '../index';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExtendStayData = {
    bookingId: string;
    requestedNights: number;
    newCheckOut: Date;
    reason?: string;
    notes?: string;
};

export type ApproveExtensionData = {
    extraChargeAmount?: number;
    chargeDescription?: string;
    approvedById: string;
    keepSameRoom?: boolean; // If true, extend in same room; if false, may need room change
};

// ─── Create Extension Request ─────────────────────────────────────────────────

/**
 * Create a stay extension request
 */
export async function createStayExtensionRequest(data: ExtendStayData) {
    const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        include: { room: true },
    });

    if (!booking) {
        throw new Error(`Booking not found: ${data.bookingId}`);
    }

    // Validate the extension is possible
    if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
        throw new Error('Can only extend stays for confirmed or checked-in bookings');
    }

    const currentCheckOut = new Date(booking.checkOut);
    const newCheckOutDate = new Date(data.newCheckOut);

    if (newCheckOutDate <= currentCheckOut) {
        throw new Error('New check-out date must be after current check-out date');
    }

    // Calculate additional nights
    const nightsDiff = Math.ceil((newCheckOutDate.getTime() - currentCheckOut.getTime()) / (1000 * 60 * 60 * 24));

    if (nightsDiff < 1) {
        throw new Error('Extension must be at least 1 night');
    }

    // Calculate extra charge (simplified - actual implementation would use pricing module)
    const nightlyRate = booking.room.basePriceDouble.toNumber();
    const extraChargeAmount = nightlyRate * nightsDiff;

    return prisma.stayModificationRequest.create({
        data: {
            bookingId: data.bookingId,
            type: 'EXTEND_STAY',
            status: 'PENDING',
            originalCheckIn: booking.checkIn,
            originalCheckOut: booking.checkOut,
            requestedCheckOut: newCheckOutDate,
            requestedNights: data.requestedNights,
            newCheckOut: newCheckOutDate,
            reason: data.reason,
            notes: data.notes,
            extraChargeAmount: new Decimal(extraChargeAmount),
            chargeDescription: `Extension of ${nightsDiff} night(s) @ ₹${nightlyRate}/night`,
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
        },
    });
}

// ─── Approve Extension ───────────────────────────────────────────────────────

/**
 * Approve a stay extension request
 */
export async function approveStayExtension(
    id: string,
    data: ApproveExtensionData
) {
    const request = await prisma.stayModificationRequest.findUnique({
        where: { id },
        include: { booking: { include: { room: true } } },
    });

    if (!request) {
        throw new Error(`Stay extension request not found: ${id}`);
    }

    if (request.type !== 'EXTEND_STAY') {
        throw new Error('This is not a stay extension request');
    }

    if (request.status !== 'PENDING') {
        throw new Error(`Request is not pending. Current status: ${request.status}`);
    }

    // Update the request
    const updatedRequest = await prisma.stayModificationRequest.update({
        where: { id },
        data: {
            status: 'APPROVED',
            approvedById: data.approvedById,
            approvedAt: new Date(),
            extraChargeAmount: data.extraChargeAmount !== undefined
                ? new Decimal(data.extraChargeAmount)
                : request.extraChargeAmount,
            chargeDescription: data.chargeDescription || request.chargeDescription,
        },
    });

    // Update booking with new check-out date
    if (request.newCheckOut) {
        await prisma.booking.update({
            where: { id: request.bookingId },
            data: {
                checkOut: request.newCheckOut,
            },
        });
    }

    // Add extra charge to booking if amount > 0
    if (request.extraChargeAmount && request.extraChargeAmount.toNumber() > 0) {
        const currentExtras = request.booking.extrasAmount || new Decimal(0);
        const chargeAmount = data.extraChargeAmount !== undefined
            ? data.extraChargeAmount
            : request.extraChargeAmount.toNumber();

        await prisma.booking.update({
            where: { id: request.bookingId },
            data: {
                extrasAmount: currentExtras.add(new Decimal(chargeAmount)),
                totalAmount: request.booking.totalAmount.add(new Decimal(chargeAmount)),
            },
        });
    }

    return updatedRequest;
}

// ─── Reject Extension ────────────────────────────────────────────────────────

/**
 * Reject a stay extension request
 */
export async function rejectStayExtension(
    id: string,
    rejectedById: string,
    rejectionReason?: string
) {
    const request = await prisma.stayModificationRequest.findUnique({
        where: { id },
    });

    if (!request) {
        throw new Error(`Stay extension request not found: ${id}`);
    }

    if (request.type !== 'EXTEND_STAY') {
        throw new Error('This is not a stay extension request');
    }

    if (request.status !== 'PENDING') {
        throw new Error(`Request is not pending. Current status: ${request.status}`);
    }

    return prisma.stayModificationRequest.update({
        where: { id },
        data: {
            status: 'REJECTED',
            approvedById: rejectedById,
            approvedAt: new Date(),
            rejectionReason,
        },
    });
}

// ─── Get Pending Extension ──────────────────────────────────────────────────

/**
 * Get pending extension request for a booking
 */
export async function getPendingExtensionByBookingId(bookingId: string) {
    return prisma.stayModificationRequest.findFirst({
        where: {
            bookingId,
            type: 'EXTEND_STAY',
            status: 'PENDING',
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}

// ─── Check Room Availability for Extension ──────────────────────────────────

/**
 * Check if the current room is available for extension
 */
export async function checkRoomAvailabilityForExtension(
    bookingId: string,
    newCheckOut: Date
) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { room: true },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    // Check if room is available for the extended period
    const conflictingBookings = await prisma.booking.findMany({
        where: {
            id: { not: bookingId },
            roomId: booking.roomId,
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            checkIn: { lt: newCheckOut },
            checkOut: { gt: booking.checkOut },
        },
    });

    if (conflictingBookings.length > 0) {
        return {
            available: false,
            sameRoom: false,
            alternativeRooms: [],
            message: 'Current room is not available for the extended period',
        };
    }

    return {
        available: true,
        sameRoom: true,
        alternativeRooms: [],
        message: 'Current room is available for extension',
    };
}

// ─── Get Extension History ───────────────────────────────────────────────────

/**
 * Get stay extension history for a booking
 */
export async function getExtensionHistory(bookingId: string) {
    return prisma.stayModificationRequest.findMany({
        where: {
            bookingId,
            type: 'EXTEND_STAY',
        },
        include: {
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
