import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * Early Check-in Request Handling
 * 
 * Early check-in = check-in time is before standard check-in time (typically 14:00)
 */

// ─── Types ────────────────────────────────────────────────────────────────────────

export type EarlyCheckInResult = {
    success: boolean;
    type: 'REGULAR' | 'EARLY';
    noCharge: boolean;
    canCheckIn: boolean;
    fee?: number;
    requestId?: string;
    message?: string;
    roomReady?: boolean;
};

// ─── Request Early Check-in ───────────────────────────────────────────────────

export async function requestEarlyCheckIn(
    bookingId: string,
    requestedTime: Date,
    reason?: string
): Promise<EarlyCheckInResult> {
    return prisma.$transaction(async (tx) => {
        // 1. Get booking details
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: {
                room: true,
                property: true,
            },
        });

        if (!booking) {
            throw new Error('BOOKING_NOT_FOUND');
        }

        if (booking.status !== 'CONFIRMED') {
            throw new Error('BOOKING_NOT_CONFIRMED');
        }

        // 2. Get hotel settings
        const settings = await tx.hotelSettings.findUnique({
            where: { id: booking.propertyId },
        });

        // 3. Calculate if early check-in is applicable
        const checkInHour = settings?.checkInTime
            ? parseInt(settings.checkInTime.split(':')[0])
            : 14; // Default 2 PM

        const requestedHour = requestedTime.getHours();
        const isEarly = requestedHour < checkInHour;

        if (!isEarly) {
            // Not early check-in, just regular check-in
            return { type: 'REGULAR', noCharge: true, canCheckIn: true };
        }

        // 4. Check room status
        const room = await tx.room.findUnique({
            where: { id: booking.roomId },
        });

        if (!room) {
            throw new Error('ROOM_NOT_FOUND');
        }

        // 5. Calculate early check-in fee
        const freeEarlyHour = settings?.earlyCheckinCutoffHour || 10;
        const fee = calculateEarlyCheckInFee(settings, requestedHour, checkInHour);

        if (room.cleaningStatus === 'CLEAN') {
            // Room ready
            if (requestedHour < freeEarlyHour) {
                return {
                    type: 'EARLY',
                    noCharge: true,
                    canCheckIn: true,
                    roomReady: true,
                };
            }

            return {
                type: 'EARLY',
                noCharge: false,
                fee,
                canCheckIn: true,
                roomReady: true,
            };
        }

        // 6. Room not ready - create stay modification request
        const request = await tx.stayModificationRequest.create({
            data: {
                bookingId: booking.id,
                type: 'EARLY_CHECKIN',
                status: 'PENDING',
                originalCheckIn: booking.checkIn,
                originalCheckOut: booking.checkOut,
                requestedCheckIn: requestedTime,
                reason,
                extraChargeAmount: new Prisma.Decimal(fee),
                chargeDescription: `Early check-in before ${checkInHour}:00`,
            },
        });

        // 7. Mark room for priority cleaning if needed
        if (room.cleaningStatus === 'DIRTY' || room.cleaningStatus === 'CLEANING') {
            await tx.room.update({
                where: { id: booking.roomId },
                data: {
                    isPriorityCleaning: true,
                    priorityReason: `Early check-in requested at ${requestedTime.toISOString()}`,
                },
            });
        }

        // 8. Update booking with early check-in request
        await tx.booking.update({
            where: { id: bookingId },
            data: {
                earlyCheckInRequested: true,
            },
        });

        return {
            type: 'EARLY',
            noCharge: fee === 0,
            fee,
            canCheckIn: false,
            requestId: request.id,
            message: 'Room being prepared, you will be notified when ready',
            roomReady: false,
        };
    });
}

// ─── Approve/Deny Early Check-in ─────────────────────────────────────────────

export type ApproveEarlyCheckInResult = {
    success: boolean;
    approved: boolean;
    booking?: any;
    message: string;
};

export async function approveEarlyCheckIn(
    bookingId: string,
    approved: boolean,
    approvedById?: string,
    rejectionReason?: string
): Promise<ApproveEarlyCheckInResult> {
    return prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: {
                room: true,
                stayModificationRequests: {
                    where: {
                        type: 'EARLY_CHECKIN',
                        status: 'PENDING',
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!booking) {
            throw new Error('BOOKING_NOT_FOUND');
        }

        if (!booking.earlyCheckInRequested) {
            throw new Error('NO_EARLY_CHECKIN_REQUEST');
        }

        const pendingRequest = booking.stayModificationRequests[0];

        if (approved) {
            // Approve the early check-in
            // Update booking
            const updatedBooking = await tx.booking.update({
                where: { id: bookingId },
                data: {
                    earlyCheckInApproved: true,
                },
            });

            // Update the modification request
            if (pendingRequest) {
                await tx.stayModificationRequest.update({
                    where: { id: pendingRequest.id },
                    data: {
                        status: 'APPROVED',
                        approvedById,
                        approvedAt: new Date(),
                    },
                });
            }

            // Apply any extra charges
            if (pendingRequest && pendingRequest.extraChargeAmount) {
                await tx.booking.update({
                    where: { id: bookingId },
                    data: {
                        extrasAmount: {
                            increment: pendingRequest.extraChargeAmount,
                        },
                    },
                });
            }

            return {
                success: true,
                approved: true,
                booking: updatedBooking,
                message: 'Early check-in approved',
            };
        } else {
            // Deny the early check-in
            if (pendingRequest) {
                await tx.stayModificationRequest.update({
                    where: { id: pendingRequest.id },
                    data: {
                        status: 'REJECTED',
                        approvedById,
                        approvedAt: new Date(),
                        rejectionReason,
                    },
                });
            }

            // Reset booking early check-in flag
            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    earlyCheckInRequested: false,
                },
            });

            return {
                success: true,
                approved: false,
                message: rejectionReason || 'Early check-in denied. Standard check-in time applies.',
            };
        }
    });
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function calculateEarlyCheckInFee(
    settings: any,
    requestedHour: number,
    checkInHour: number
): number {
    if (!settings?.earlyCheckinEnabled) {
        return 0;
    }

    const chargeType = settings.earlyCheckinChargeType || 'HALF_DAY';
    const baseFee = settings.earlyCheckInFee?.toNumber() || 500;

    switch (chargeType) {
        case 'HALF_DAY':
            return baseFee;
        case 'HOURLY': {
            const hoursEarly = checkInHour - requestedHour;
            return baseFee * Math.max(1, hoursEarly);
        }
        case 'FULL_DAY':
            return baseFee * 2;
        default:
            return baseFee;
    }
}

// ─── Get Early Check-in Status ───────────────────────────────────────────────

export async function getEarlyCheckInStatus(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            stayModificationRequests: {
                where: {
                    type: 'EARLY_CHECKIN',
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
    });

    if (!booking) {
        throw new Error('BOOKING_NOT_FOUND');
    }

    const pendingRequest = booking.stayModificationRequests[0];

    return {
        requested: booking.earlyCheckInRequested,
        approved: booking.earlyCheckInApproved,
        pendingRequest: pendingRequest
            ? {
                id: pendingRequest.id,
                status: pendingRequest.status,
                requestedCheckIn: pendingRequest.requestedCheckIn,
                extraChargeAmount: pendingRequest.extraChargeAmount?.toNumber(),
                chargeDescription: pendingRequest.chargeDescription,
            }
            : null,
    };
}
