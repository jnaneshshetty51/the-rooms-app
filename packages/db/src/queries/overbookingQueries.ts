import prisma from '../index';
import { RoomType } from '@prisma/client';

/**
 * ─── Overbooking Queries (Scenario 45) ───────────────────────────────────
 *
 * Functions for overbooking management:
 * - Check overbooking availability
 * - Create overbooking alerts
 * - Resolve overbooking alerts
 */

// ─── Check Overbooking ────────────────────────────────────────────────────

export type CheckOverbookingResult = {
    roomType: RoomType;
    date: Date;
    totalRooms: number;
    bookedRooms: number;
    availableRooms: number;
    overbookLimit: number;
    effectiveAvailability: number;
    isOverbooked: boolean;
};

/**
 * Check overbooking availability for a room type on a specific date
 */
export async function checkOverbooking(
    roomTypeId: RoomType,
    date: Date,
    propertyId: string = 'default'
): Promise<CheckOverbookingResult> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get total rooms of this type
    const totalRooms = await prisma.room.count({
        where: {
            type: roomTypeId,
            propertyId,
            status: { not: 'MAINTENANCE' },
        },
    });

    // Get booked rooms for this date
    const bookedRooms = await prisma.booking.count({
        where: {
            propertyId,
            room: { type: roomTypeId },
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            checkIn: { lte: endOfDay },
            checkOut: { gt: startOfDay },
        },
    });

    // Get overbooking policy
    const policy = await prisma.overbookingPolicy.findUnique({
        where: { propertyId },
    });

    const overbookLimit = roomTypeId === 'STUDIO'
        ? (policy?.studioOverbookLimit || 0)
        : (policy?.premiumOverbookLimit || 0);

    const availableRooms = totalRooms - bookedRooms;
    const effectiveAvailability = availableRooms - overbookLimit;
    const isOverbooked = effectiveAvailability < 0;

    return {
        roomType: roomTypeId,
        date,
        totalRooms,
        bookedRooms,
        availableRooms,
        overbookLimit,
        effectiveAvailability,
        isOverbooked,
    };
}

// ─── Create Overbooking Alert ─────────────────────────────────────────────

export type OverbookingAlertType = 'UPGRADE_FREE' | 'RELOCATE_PARTNER' | 'RELOCATE_GUEST' | 'CANCEL_REFUND' | 'CANCEL_NO_REFUND';

export type CreateOverbookingAlertParams = {
    bookingId: string;
    roomTypeId: RoomType;
    date: Date;
    alternatives?: string[];
    suggestedAction?: OverbookingAlertType;
    notes?: string;
    createdById?: string;
};

export type CreateOverbookingAlertResult = {
    alert: {
        id: string;
        bookingId: string;
        roomType: string;
        date: Date;
        status: string;
        suggestedAction: string | null;
    };
    booking: {
        id: string;
        bookingNumber: string;
        guest: { name: string; phone: string };
    };
};

/**
 * Create an overbooking alert when a room type is overbooked
 */
export async function createOverbookingAlert(params: CreateOverbookingAlertParams) {
    const {
        bookingId,
        roomTypeId,
        date,
        alternatives,
        suggestedAction,
        notes,
        createdById,
    } = params;

    return prisma.$transaction(async (tx) => {
        // Create overbooking alert
        // Note: There's no OverbookingAlert model in schema, so we use Alert model
        const alert = await tx.alert.create({
            data: {
                severity: 'WARNING',
                title: `Overbooking Alert: ${roomTypeId} room on ${date.toISOString().split('T')[0]}`,
                message: JSON.stringify({
                    bookingId,
                    roomType: roomTypeId,
                    date: date.toISOString(),
                    alternatives: alternatives || [],
                    suggestedAction,
                    notes,
                }),
            },
        });

        // Mark booking as overbooking
        const booking = await tx.booking.update({
            where: { id: bookingId },
            data: { isOverbooking: true },
            include: {
                guest: {
                    select: { name: true, phone: true },
                },
            },
        });

        return {
            alert: {
                id: alert.id,
                bookingId,
                roomType: roomTypeId,
                date,
                status: 'OPEN',
                suggestedAction,
            },
            booking: {
                id: booking.id,
                bookingNumber: booking.bookingNumber,
                guest: booking.guest,
            },
        };
    });
}

// ─── Resolve Overbooking ──────────────────────────────────────────────────

export type ResolveOverbookingParams = {
    alertId: string;
    resolution: OverbookingAlertType;
    actionTaken: string;
    alternativeRoomId?: string;
    partnerHotelId?: string;
    refundAmount?: number;
    resolvedById?: string;
};

export type ResolveOverbookingResult = {
    alert: {
        id: string;
        status: string;
        resolution: string;
    };
    booking: {
        id: string;
        bookingNumber: string;
        isOverbooking: boolean;
    };
    alternativeRoom?: {
        id: string;
        roomNumber: string;
    } | null;
};

/**
 * Resolve an overbooking alert with the action taken
 */
export async function resolveOverbooking(params: ResolveOverbookingParams) {
    const {
        alertId,
        resolution,
        actionTaken,
        alternativeRoomId,
        partnerHotelId,
        refundAmount,
        resolvedById,
    } = params;

    return prisma.$transaction(async (tx) => {
        // Get the alert with its metadata
        const alert = await tx.alert.findUnique({
            where: { id: alertId },
        });

        if (!alert) {
            throw new Error('ALERT_NOT_FOUND');
        }

        const metadata = JSON.parse(alert.message);
        const bookingId = metadata.bookingId;

        // Update alert
        const updatedAlert = await tx.alert.update({
            where: { id: alertId },
            data: {
                message: JSON.stringify({
                    ...metadata,
                    resolution,
                    actionTaken,
                    alternativeRoomId,
                    partnerHotelId,
                    refundAmount,
                    resolvedAt: new Date().toISOString(),
                    resolvedBy: resolvedById,
                }),
            },
        });

        // If alternative room provided, update booking room
        let alternativeRoom = null;
        if (alternativeRoomId) {
            const room = await tx.room.findUnique({
                where: { id: alternativeRoomId },
                select: { id: true, roomNumber: true },
            });
            alternativeRoom = room;

            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    roomId: alternativeRoomId,
                    isOverbooking: false,
                },
            });
        }

        // If refund, create refund payment
        if (refundAmount && refundAmount > 0) {
            // Find the original payment to refund
            const originalPayment = await tx.payment.findFirst({
                where: { bookingId, status: 'PAID' },
                orderBy: { createdAt: 'desc' },
            });

            if (originalPayment) {
                await tx.payment.create({
                    data: {
                        bookingId,
                        amount: new (require('@prisma/client/runtime/library')).Decimal(refundAmount),
                        method: originalPayment.method,
                        status: 'PENDING',
                        refundReason: `Overbooking resolution: ${actionTaken}`,
                        refundStatus: 'PENDING',
                    },
                });
            }
        }

        // If no alternative room, just clear the overbooking flag
        if (!alternativeRoomId) {
            await tx.booking.update({
                where: { id: bookingId },
                data: { isOverbooking: false },
            });
        }

        // Get updated booking
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                bookingNumber: true,
                isOverbooking: true,
            },
        });

        return {
            alert: {
                id: updatedAlert.id,
                status: 'RESOLVED',
                resolution: actionTaken,
            },
            booking: {
                id: booking!.id,
                bookingNumber: booking!.bookingNumber,
                isOverbooking: booking!.isOverbooking,
            },
            alternativeRoom,
        };
    });
}

// ─── Get Overbooking Alerts ────────────────────────────────────────────────

/**
 * Get all overbooking alerts for a property
 */
export async function getOverbookingAlerts(
    propertyId: string = 'default',
    options: {
        status?: 'OPEN' | 'RESOLVED';
        startDate?: Date;
        endDate?: Date;
        page?: number;
        perPage?: number;
    } = {}
) {
    const { status, startDate, endDate, page = 1, perPage = 20 } = options;

    const where: any = {
        title: { contains: 'Overbooking Alert' },
    };

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const [alerts, total] = await Promise.all([
        prisma.alert.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.alert.count({ where }),
    ]);

    // Parse metadata for each alert
    const parsedAlerts = alerts.map(alert => {
        const metadata = JSON.parse(alert.message);
        return {
            id: alert.id,
            severity: alert.severity,
            title: alert.title,
            createdAt: alert.createdAt,
            bookingId: metadata.bookingId,
            roomType: metadata.roomType,
            date: metadata.date,
            suggestedAction: metadata.suggestedAction,
            resolution: metadata.resolution || null,
            actionTaken: metadata.actionTaken || null,
            resolvedAt: metadata.resolvedAt || null,
        };
    });

    return {
        alerts: parsedAlerts,
        total,
        pages: Math.ceil(total / perPage),
        page,
    };
}

// ─── Get Overbooking Policy ────────────────────────────────────────────────

/**
 * Get overbooking policy for a property
 */
export async function getOverbookingPolicy(propertyId: string = 'default') {
    return prisma.overbookingPolicy.findUnique({
        where: { propertyId },
        include: {
            partnerHotel: true,
        },
    });
}

// ─── Update Overbooking Policy ────────────────────────────────────────────

export type UpdateOverbookingPolicyParams = {
    propertyId: string;
    isEnabled?: boolean;
    studioOverbookLimit?: number;
    premiumOverbookLimit?: number;
    enableWaitlist?: boolean;
    waitlistTimeout?: number;
    partnerHotelId?: string;
    partnerHotelName?: string;
    partnerHotelContact?: string;
    partnerHotelRate?: number;
};

/**
 * Update overbooking policy for a property
 */
export async function updateOverbookingPolicy(params: UpdateOverbookingPolicyParams) {
    const {
        propertyId,
        isEnabled,
        studioOverbookLimit,
        premiumOverbookLimit,
        enableWaitlist,
        waitlistTimeout,
        partnerHotelId,
        partnerHotelName,
        partnerHotelContact,
        partnerHotelRate,
    } = params;

    return prisma.overbookingPolicy.upsert({
        where: { propertyId },
        create: {
            propertyId,
            isEnabled: isEnabled || false,
            studioOverbookLimit: studioOverbookLimit || 0,
            premiumOverbookLimit: premiumOverbookLimit || 0,
            enableWaitlist: enableWaitlist || true,
            waitlistTimeout: waitlistTimeout || 60,
            partnerHotelId,
            partnerHotelName,
            partnerHotelContact,
            partnerHotelRate: partnerHotelRate ? new (require('@prisma/client/runtime/library')).Decimal(partnerHotelRate) : undefined,
        },
        update: {
            isEnabled: isEnabled !== undefined ? isEnabled : undefined,
            studioOverbookLimit: studioOverbookLimit !== undefined ? studioOverbookLimit : undefined,
            premiumOverbookLimit: premiumOverbookLimit !== undefined ? premiumOverbookLimit : undefined,
            enableWaitlist: enableWaitlist !== undefined ? enableWaitlist : undefined,
            waitlistTimeout: waitlistTimeout !== undefined ? waitlistTimeout : undefined,
            partnerHotelId: partnerHotelId !== undefined ? partnerHotelId : undefined,
            partnerHotelName: partnerHotelName !== undefined ? partnerHotelName : undefined,
            partnerHotelContact: partnerHotelContact !== undefined ? partnerHotelContact : undefined,
            partnerHotelRate: partnerHotelRate !== undefined ? new (require('@prisma/client/runtime/library')).Decimal(partnerHotelRate) : undefined,
        },
    });
}
