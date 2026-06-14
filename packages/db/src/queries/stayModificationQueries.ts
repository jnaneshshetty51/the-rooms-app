// packages/db/src/queries/stayModificationQueries.ts
// Query helpers for StayModificationRequest

import prisma from '../index';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Types ───────────────────────────────────────────────────────────────────

export type StayModificationPolicy = {
    // Early check-in
    earlyCheckinEnabled: boolean;
    earlyCheckinCutoffHour: number;
    earlyCheckinChargeType: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY';

    // Late check-out
    lateCheckoutEnabled: boolean;
    lateCheckoutCutoffHour: number;
    lateCheckoutChargeType: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY';
    lateCheckoutMaxHour: number;
};

export type CreateStayModificationData = {
    bookingId: string;
    type: 'EARLY_CHECKIN' | 'LATE_CHECKOUT';
    requestedCheckIn?: Date;
    requestedCheckOut?: Date;
    reason?: string;
    notes?: string;
};

export type ApproveStayModificationData = {
    extraChargeAmount?: number;
    chargeDescription?: string;
    approvedById: string;
};

// ─── Policy Helpers ───────────────────────────────────────────────────────────

/**
 * Get stay modification policy from hotel settings
 */
export async function getStayModificationPolicy(propertyId: string = 'default'): Promise<StayModificationPolicy> {
    const settings = await prisma.hotelSettings.findUnique({
        where: { id: propertyId === 'default' ? 'default' : propertyId },
    });

    return {
        earlyCheckinEnabled: settings?.earlyCheckinEnabled ?? true,
        earlyCheckinCutoffHour: settings?.earlyCheckinCutoffHour ?? 10,
        earlyCheckinChargeType: (settings?.earlyCheckinChargeType as StayModificationPolicy['earlyCheckinChargeType']) || 'HALF_DAY',
        lateCheckoutEnabled: settings?.lateCheckoutEnabled ?? true,
        lateCheckoutCutoffHour: settings?.lateCheckoutCutoffHour ?? 12,
        lateCheckoutChargeType: (settings?.lateCheckoutChargeType as StayModificationPolicy['lateCheckoutChargeType']) || 'HALF_DAY',
        lateCheckoutMaxHour: settings?.lateCheckoutMaxHour ?? 16,
    };
}

/**
 * Calculate extra charge for early check-in or late check-out
 */
export async function calculateStayModificationCharge(
    bookingId: string,
    type: 'EARLY_CHECKIN' | 'LATE_CHECKOUT',
    requestedTime: Date,
    policy: StayModificationPolicy
): Promise<{ amount: number; description: string }> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { room: true },
    });

    if (!booking) {
        throw new Error(`Booking not found: ${bookingId}`);
    }

    // Get the nightly rate (use double rate as default)
    const nightlyRate = booking.room.basePriceDouble.toNumber();

    if (type === 'EARLY_CHECKIN') {
        if (!policy.earlyCheckinEnabled) {
            return { amount: 0, description: 'Early check-in is not available' };
        }

        // Check if within free period (before cutoff hour on check-in day)
        const checkInHour = requestedTime.getHours();
        if (checkInHour < policy.earlyCheckinCutoffHour) {
            return { amount: 0, description: 'Early check-in is free (before cutoff hour)' };
        }

        // Calculate charge based on charge type
        let amount = 0;
        let description = '';

        switch (policy.earlyCheckinChargeType) {
            case 'HOURLY': {
                const hoursEarly = checkInHour - policy.earlyCheckinCutoffHour;
                const hourlyRate = nightlyRate / 24;
                amount = hourlyRate * hoursEarly;
                description = `Early check-in charge (${hoursEarly} hour${hoursEarly > 1 ? 's' : ''} @ ₹${hourlyRate.toFixed(2)}/hour)`;
                break;
            }
            case 'HALF_DAY': {
                amount = nightlyRate / 2;
                description = 'Early check-in charge (half day rate)';
                break;
            }
            case 'FULL_DAY': {
                amount = nightlyRate;
                description = 'Early check-in charge (full day rate)';
                break;
            }
        }

        return { amount, description };
    } else {
        // LATE_CHECKOUT
        if (!policy.lateCheckoutEnabled) {
            return { amount: 0, description: 'Late check-out is not available' };
        }

        // Check if within free period (before cutoff hour on checkout day)
        const checkOutHour = requestedTime.getHours();
        if (checkOutHour <= policy.lateCheckoutCutoffHour) {
            return { amount: 0, description: 'Late check-out is free (within standard checkout time)' };
        }

        // Check if beyond max allowed hour
        if (checkOutHour > policy.lateCheckoutMaxHour) {
            return { amount: 0, description: `Late check-out not available after ${policy.lateCheckoutMaxHour}:00` };
        }

        // Calculate charge based on charge type
        let amount = 0;
        let description = '';

        switch (policy.lateCheckoutChargeType) {
            case 'HOURLY': {
                const hoursLate = checkOutHour - policy.lateCheckoutCutoffHour;
                const hourlyRate = nightlyRate / 24;
                amount = hourlyRate * hoursLate;
                description = `Late check-out charge (${hoursLate} hour${hoursLate > 1 ? 's' : ''} @ ₹${hourlyRate.toFixed(2)}/hour)`;
                break;
            }
            case 'HALF_DAY': {
                amount = nightlyRate / 2;
                description = 'Late check-out charge (half day rate)';
                break;
            }
            case 'FULL_DAY': {
                amount = nightlyRate;
                description = 'Late check-out charge (full day rate)';
                break;
            }
        }

        return { amount, description };
    }
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

/**
 * Create a new stay modification request
 */
export async function createStayModificationRequest(data: CreateStayModificationData) {
    const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        include: { room: true },
    });

    if (!booking) {
        throw new Error(`Booking not found: ${data.bookingId}`);
    }

    // Get policy
    const policy = await getStayModificationPolicy(booking.propertyId);

    // Determine the requested time
    const requestedTime = data.type === 'EARLY_CHECKIN'
        ? (data.requestedCheckIn || booking.checkIn)
        : (data.requestedCheckOut || booking.checkOut);

    // Calculate the charge
    const { amount, description } = await calculateStayModificationCharge(
        data.bookingId,
        data.type,
        requestedTime,
        policy
    );

    return prisma.stayModificationRequest.create({
        data: {
            bookingId: data.bookingId,
            type: data.type,
            status: 'PENDING',
            originalCheckIn: booking.checkIn,
            originalCheckOut: booking.checkOut,
            requestedCheckIn: data.requestedCheckIn,
            requestedCheckOut: data.requestedCheckOut,
            reason: data.reason,
            notes: data.notes,
            extraChargeAmount: amount > 0 ? new Decimal(amount) : null,
            chargeDescription: amount > 0 ? description : null,
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

/**
 * Get pending stay modification request for a booking
 */
export async function getPendingRequestByBookingId(bookingId: string) {
    return prisma.stayModificationRequest.findFirst({
        where: {
            bookingId,
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

/**
 * Get stay modification request by ID
 */
export async function getStayModificationRequestById(id: string) {
    return prisma.stayModificationRequest.findUnique({
        where: { id },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

/**
 * Get all pending stay modification requests
 */
export async function getPendingStayModifications(propertyId?: string) {
    const where: Prisma.StayModificationRequestWhereInput = {
        status: 'PENDING',
    };

    if (propertyId) {
        where.booking = {
            propertyId,
        };
    }

    return prisma.stayModificationRequest.findMany({
        where,
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });
}

/**
 * Approve a stay modification request
 */
export async function approveStayModificationRequest(
    id: string,
    data: ApproveStayModificationData
) {
    const request = await prisma.stayModificationRequest.findUnique({
        where: { id },
        include: { booking: true },
    });

    if (!request) {
        throw new Error(`Stay modification request not found: ${id}`);
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
            extraChargeAmount: data.extraChargeAmount
                ? new Decimal(data.extraChargeAmount)
                : request.extraChargeAmount,
            chargeDescription: data.chargeDescription || request.chargeDescription,
        },
    });

    // Update booking dates if applicable
    const bookingUpdateData: Prisma.BookingUpdateInput = {};

    if (request.type === 'EARLY_CHECKIN' && request.requestedCheckIn) {
        bookingUpdateData.checkIn = request.requestedCheckIn;
    } else if (request.type === 'LATE_CHECKOUT' && request.requestedCheckOut) {
        bookingUpdateData.checkOut = request.requestedCheckOut;
    }

    if (Object.keys(bookingUpdateData).length > 0) {
        await prisma.booking.update({
            where: { id: request.bookingId },
            data: bookingUpdateData,
        });
    }

    // Add extra charge to booking if amount > 0
    if (request.extraChargeAmount && request.extraChargeAmount.toNumber() > 0) {
        const currentExtras = request.booking.extrasAmount || new Decimal(0);
        await prisma.booking.update({
            where: { id: request.bookingId },
            data: {
                extrasAmount: currentExtras.add(request.extraChargeAmount),
                totalAmount: request.booking.totalAmount.add(request.extraChargeAmount),
            },
        });
    }

    return updatedRequest;
}

/**
 * Reject a stay modification request
 */
export async function rejectStayModificationRequest(
    id: string,
    rejectedById: string,
    rejectionReason?: string
) {
    const request = await prisma.stayModificationRequest.findUnique({
        where: { id },
    });

    if (!request) {
        throw new Error(`Stay modification request not found: ${id}`);
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

/**
 * Get stay modification history for a booking
 */
export async function getStayModificationHistory(bookingId: string) {
    return prisma.stayModificationRequest.findMany({
        where: { bookingId },
        include: {
            approvedBy: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
