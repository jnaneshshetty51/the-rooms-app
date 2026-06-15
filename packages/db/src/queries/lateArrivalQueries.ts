import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * Late Arrival (After Midnight) Check-in Handling
 * 
 * Late arrival = arrival time is between 00:00 and 06:00
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export type LateArrivalResult = {
    success: boolean;
    isLateArrival: boolean;
    autoCheckIn: boolean;
    requiresManualCheckIn: boolean;
    message: string;
    lateArrivalInfo?: {
        windowStart: string;
        windowEnd: string;
        expectedTime?: string;
    };
};

export type LateArrivalCheckInParams = {
    actualCheckInTime: Date;
    initiatedById?: string;
    skipAutoCheckIn?: boolean;
};

// ─── Process Late Arrival Check-in ─────────────────────────────────────────────

export async function processLateArrivalCheckIn(
    bookingId: string,
    params: LateArrivalCheckInParams
): Promise<LateArrivalResult> {
    return prisma.$transaction(async (tx) => {
        // 1. Get booking
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

        // 2. Get late arrival policy
        const policy = await tx.lateArrivalPolicy.findUnique({
            where: { propertyId: booking.propertyId },
        }) || getDefaultLateArrivalPolicy();

        // 3. Check if arrival is in late window
        const hour = params.actualCheckInTime.getHours();
        const isLateArrival = hour >= policy.lateArrivalStartHour &&
            hour < policy.lateArrivalEndHour;

        if (!isLateArrival) {
            // Regular check-in - not late arrival
            return {
                success: true,
                isLateArrival: false,
                autoCheckIn: false,
                requiresManualCheckIn: false,
                message: 'Regular check-in time',
            };
        }

        // 4. Check if auto check-in is allowed
        if (policy.autoCheckInEnabled && !params.skipAutoCheckIn) {
            // Verify conditions for auto check-in
            const roomReady = booking.room.cleaningStatus === 'CLEAN' &&
                booking.room.status === 'VACANT';

            if (roomReady && policy.allowAutoRoomAssignment) {
                // Auto check-in
                await tx.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: 'CHECKED_IN',
                        checkInTime: params.actualCheckInTime,
                        lateArrivalInfo: {
                            expectedTime: booking.lateArrivalInfo
                                ? (booking.lateArrivalInfo as any).expectedTime
                                : null,
                            actualTime: params.actualCheckInTime.toISOString(),
                            autoProcessed: true,
                        },
                    },
                });

                await tx.room.update({
                    where: { id: booking.roomId },
                    data: { status: 'OCCUPIED' },
                });

                // Create audit log
                await tx.auditLog.create({
                    data: {
                        bookingId,
                        action: 'AUTO_CHECKIN_LATE',
                        entity: 'booking',
                        entityId: bookingId,
                        userId: params.initiatedById,
                        metadata: {
                            actualCheckInTime: params.actualCheckInTime.toISOString(),
                            autoCheckIn: true,
                            lateArrivalWindow: `${policy.lateArrivalStartHour}:00 - ${policy.lateArrivalEndHour}:00`,
                        },
                    },
                });

                return {
                    success: true,
                    isLateArrival: true,
                    autoCheckIn: true,
                    requiresManualCheckIn: false,
                    message: 'Auto check-in completed for late arrival',
                };
            }
        }

        // 5. Manual check-in required
        // Store late arrival info
        await tx.booking.update({
            where: { id: bookingId },
            data: {
                lateArrivalInfo: {
                    expectedTime: booking.lateArrivalInfo
                        ? (booking.lateArrivalInfo as any).expectedTime
                        : null,
                    actualTime: params.actualCheckInTime.toISOString(),
                    autoProcessed: false,
                    manualVerificationRequired: true,
                },
            },
        });

        // Create alert for night staff if required
        if (policy.requireManualCheckIn) {
            await tx.alert.create({
                data: {
                    severity: 'INFO',
                    title: 'Late Arrival - Manual Check-in Required',
                    message: `Guest arriving at ${params.actualCheckInTime.toLocaleTimeString()} requires manual verification. Booking: ${booking.bookingNumber}`,
                },
            });
        }

        return {
            success: false,
            isLateArrival: true,
            autoCheckIn: false,
            requiresManualCheckIn: true,
            message: `Late arrival requires manual check-in. Arrival time: ${params.actualCheckInTime.toLocaleTimeString()}`,
            lateArrivalInfo: {
                windowStart: `${policy.lateArrivalStartHour}:00`,
                windowEnd: `${policy.lateArrivalEndHour}:00`,
                expectedTime: booking.lateArrivalInfo
                    ? (booking.lateArrivalInfo as any).expectedTime
                    : undefined,
            },
        };
    });
}

// ─── Update Late Arrival Settings ─────────────────────────────────────────────

export async function updateLateArrivalSettings(
    bookingId: string,
    settings: {
        autoCheckInEnabled?: boolean;
        expectedArrivalTime?: Date;
    },
    updatedById?: string
) {
    return prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new Error('BOOKING_NOT_FOUND');
        }

        const currentLateArrivalInfo = (booking.lateArrivalInfo as any) || {};

        const updatedBooking = await tx.booking.update({
            where: { id: bookingId },
            data: {
                lateArrivalInfo: {
                    ...currentLateArrivalInfo,
                    autoCheckInEnabled: settings.autoCheckInEnabled,
                    expectedTime: settings.expectedArrivalTime?.toISOString(),
                },
            },
        });

        // Audit log
        await tx.auditLog.create({
            data: {
                bookingId,
                userId: updatedById,
                action: 'LATE_ARRIVAL_SETTINGS_UPDATED',
                entity: 'booking',
                entityId: bookingId,
                metadata: {
                    autoCheckInEnabled: settings.autoCheckInEnabled,
                    expectedArrivalTime: settings.expectedArrivalTime?.toISOString(),
                },
            },
        });

        return updatedBooking;
    });
}

// ─── Get Late Arrival Policy ───────────────────────────────────────────────────

export async function getLateArrivalPolicy(propertyId: string = 'default') {
    const policy = await prisma.lateArrivalPolicy.findUnique({
        where: { propertyId },
    });

    return policy || getDefaultLateArrivalPolicy();
}

// ─── Update Late Arrival Policy ────────────────────────────────────────────────

export async function updateLateArrivalPolicy(
    propertyId: string,
    settings: {
        lateArrivalStartHour?: number;
        lateArrivalEndHour?: number;
        autoCheckInEnabled?: boolean;
        autoCheckInCutoffHour?: number;
        notifyGuest?: boolean;
        requireManualCheckIn?: boolean;
        allowAutoRoomAssignment?: boolean;
    }
) {
    return prisma.lateArrivalPolicy.upsert({
        where: { propertyId },
        create: {
            propertyId,
            lateArrivalStartHour: settings.lateArrivalStartHour ?? 0,
            lateArrivalEndHour: settings.lateArrivalEndHour ?? 6,
            autoCheckInEnabled: settings.autoCheckInEnabled ?? false,
            autoCheckInCutoffHour: settings.autoCheckInCutoffHour ?? 4,
            notifyGuest: settings.notifyGuest ?? true,
            requireManualCheckIn: settings.requireManualCheckIn ?? true,
            allowAutoRoomAssignment: settings.allowAutoRoomAssignment ?? false,
        },
        update: {
            ...(settings.lateArrivalStartHour !== undefined && { lateArrivalStartHour: settings.lateArrivalStartHour }),
            ...(settings.lateArrivalEndHour !== undefined && { lateArrivalEndHour: settings.lateArrivalEndHour }),
            ...(settings.autoCheckInEnabled !== undefined && { autoCheckInEnabled: settings.autoCheckInEnabled }),
            ...(settings.autoCheckInCutoffHour !== undefined && { autoCheckInCutoffHour: settings.autoCheckInCutoffHour }),
            ...(settings.notifyGuest !== undefined && { notifyGuest: settings.notifyGuest }),
            ...(settings.requireManualCheckIn !== undefined && { requireManualCheckIn: settings.requireManualCheckIn }),
            ...(settings.allowAutoRoomAssignment !== undefined && { allowAutoRoomAssignment: settings.allowAutoRoomAssignment }),
        },
    });
}

// ─── Helper Functions ────────────────────────────────────────────────────────────

function getDefaultLateArrivalPolicy() {
    return {
        id: 'default',
        propertyId: 'default',
        lateArrivalStartHour: 0,
        lateArrivalEndHour: 6,
        autoCheckInEnabled: false,
        autoCheckInCutoffHour: 4,
        notifyGuest: true,
        notificationTemplateId: null,
        requireManualCheckIn: true,
        allowAutoRoomAssignment: false,
        updatedAt: new Date(),
    };
}
