import prisma from '../index';
import { RoomType, BlackoutReason, BookingSource } from '@prisma/client';

/**
 * ─── Blackout Date Queries (Scenario 50) ────────────────────────────────
 *
 * Functions for blackout date management:
 * - Create/remove blackout dates
 * - Get blackout dates for a range
 * - Check if a date is blackout
 */

// ─── Create Blackout Date ────────────────────────────────────────────────

export type CreateBlackoutDateParams = {
    propertyId: string;
    date: Date;
    endDate?: Date;
    reason: BlackoutReason;
    description?: string;
    roomType?: RoomType;
    bookingSource?: BookingSource;
    createdById?: string;
};

export type CreateBlackoutDateResult = {
    blackoutDate: {
        id: string;
        propertyId: string;
        date: Date;
        endDate: Date | null;
        reason: string;
        description: string | null;
        roomType: string | null;
        bookingSource: string | null;
    };
};

/**
 * Create a new blackout date
 */
export async function createBlackoutDate(params: CreateBlackoutDateParams) {
    const {
        propertyId,
        date,
        endDate,
        reason,
        description,
        roomType,
        bookingSource,
        createdById,
    } = params;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endDateObj = endDate ? new Date(endDate) : null;
    if (endDateObj) {
        endDateObj.setHours(23, 59, 59, 999);
    }

    const blackoutDate = await prisma.blackoutDate.create({
        data: {
            propertyId,
            date: startOfDay,
            endDate: endDateObj,
            reason,
            description,
            roomType,
            bookingSource,
        },
    });

    // Audit log
    if (createdById) {
        await prisma.auditLog.create({
            data: {
                userId: createdById,
                action: 'CREATE',
                entity: 'blackout_date',
                entityId: blackoutDate.id,
                metadata: {
                    date: startOfDay.toISOString(),
                    endDate: endDateObj?.toISOString(),
                    reason,
                    roomType,
                    bookingSource,
                },
            },
        });
    }

    return {
        blackoutDate: {
            id: blackoutDate.id,
            propertyId: blackoutDate.propertyId,
            date: blackoutDate.date,
            endDate: blackoutDate.endDate,
            reason: blackoutDate.reason,
            description: blackoutDate.description,
            roomType: blackoutDate.roomType,
            bookingSource: blackoutDate.bookingSource,
        },
    };
}

// ─── Remove Blackout Date ─────────────────────────────────────────────────

export type RemoveBlackoutDateParams = {
    id: string;
    deletedById?: string;
};

export type RemoveBlackoutDateResult = {
    success: boolean;
    id: string;
};

/**
 * Remove a blackout date
 */
export async function removeBlackoutDate(params: RemoveBlackoutDateParams) {
    const { id, deletedById } = params;

    const existing = await prisma.blackoutDate.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new Error('BLACKOUT_DATE_NOT_FOUND');
    }

    await prisma.blackoutDate.delete({
        where: { id },
    });

    // Audit log
    if (deletedById) {
        await prisma.auditLog.create({
            data: {
                userId: deletedById,
                action: 'DELETE',
                entity: 'blackout_date',
                entityId: id,
                metadata: {
                    date: existing.date.toISOString(),
                    reason: existing.reason,
                },
            },
        });
    }

    return { success: true, id };
}

// ─── Get Blackout Dates ───────────────────────────────────────────────────

export type GetBlackoutDatesParams = {
    propertyId: string;
    startDate: Date;
    endDate: Date;
    roomType?: RoomType;
};

export type GetBlackoutDatesResult = {
    blackoutDates: Array<{
        id: string;
        date: Date;
        endDate: Date | null;
        reason: string;
        description: string | null;
        roomType: string | null;
        bookingSource: string | null;
    }>;
};

/**
 * Get blackout dates for a property within a date range
 */
export async function getBlackoutDates(params: GetBlackoutDatesParams) {
    const { propertyId, startDate, endDate, roomType } = params;

    const startOfStart = new Date(startDate);
    startOfStart.setHours(0, 0, 0, 0);
    const endOfEnd = new Date(endDate);
    endOfEnd.setHours(23, 59, 59, 999);

    const where: any = {
        propertyId,
        date: {
            gte: startOfStart,
            lte: endOfEnd,
        },
    };

    if (roomType) {
        where.OR = [
            { roomType: null }, // Global blackout
            { roomType }, // Matching room type
        ];
    }

    const blackoutDates = await prisma.blackoutDate.findMany({
        where,
        orderBy: { date: 'asc' },
    });

    return {
        blackoutDates: blackoutDates.map(bd => ({
            id: bd.id,
            date: bd.date,
            endDate: bd.endDate,
            reason: bd.reason,
            description: bd.description,
            roomType: bd.roomType,
            bookingSource: bd.bookingSource,
        })),
    };
}

// ─── Is Date Blackout ──────────────────────────────────────────────────────

export type IsDateBlackoutParams = {
    propertyId: string;
    date: Date;
    roomType?: RoomType;
    bookingSource?: BookingSource;
};

export type IsDateBlackoutResult = {
    isBlackout: boolean;
    blackoutDate: {
        id: string;
        reason: string;
        description: string | null;
        roomType: string | null;
        bookingSource: string | null;
    } | null;
};

/**
 * Check if a specific date is blackout for a room type and/or booking source
 */
export async function isDateBlackout(params: IsDateBlackoutParams): Promise<IsDateBlackoutResult> {
    const { propertyId, date, roomType, bookingSource } = params;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Find any blackout date that covers this date
    const blackoutDates = await prisma.blackoutDate.findMany({
        where: {
            propertyId,
            date: { lte: checkDate },
            OR: [
                { endDate: null }, // Single day blackout
                { endDate: { gte: checkDate } }, // Range blackout that includes this date
            ],
        },
    });

    for (const bd of blackoutDates) {
        // Check if global (no room type restriction)
        if (!bd.roomType && !bd.bookingSource) {
            return {
                isBlackout: true,
                blackoutDate: {
                    id: bd.id,
                    reason: bd.reason,
                    description: bd.description,
                    roomType: null,
                    bookingSource: null,
                },
            };
        }

        // Check room type match
        if (bd.roomType && roomType && bd.roomType === roomType) {
            return {
                isBlackout: true,
                blackoutDate: {
                    id: bd.id,
                    reason: bd.reason,
                    description: bd.description,
                    roomType: bd.roomType,
                    bookingSource: null,
                },
            };
        }

        // Check booking source match
        if (bd.bookingSource && bookingSource && bd.bookingSource === bookingSource) {
            return {
                isBlackout: true,
                blackoutDate: {
                    id: bd.id,
                    reason: bd.reason,
                    description: bd.description,
                    roomType: null,
                    bookingSource: bd.bookingSource,
                },
            };
        }

        // Check combined match
        if (bd.roomType && bd.bookingSource && roomType && bookingSource) {
            if (bd.roomType === roomType && bd.bookingSource === bookingSource) {
                return {
                    isBlackout: true,
                    blackoutDate: {
                        id: bd.id,
                        reason: bd.reason,
                        description: bd.description,
                        roomType: bd.roomType,
                        bookingSource: bd.bookingSource,
                    },
                };
            }
        }
    }

    return {
        isBlackout: false,
        blackoutDate: null,
    };
}

// ─── Bulk Blackout Operations ────────────────────────────────────────────

export type BulkCreateBlackoutDatesParams = {
    propertyId: string;
    startDate: Date;
    endDate: Date;
    reason: BlackoutReason;
    description?: string;
    roomType?: RoomType;
    bookingSource?: BookingSource;
    createdById?: string;
};

export type BulkCreateBlackoutDatesResult = {
    created: number;
    blackoutDates: Array<{
        id: string;
        date: Date;
        endDate: Date | null;
    }>;
};

/**
 * Create blackout dates for a range of dates
 */
export async function bulkCreateBlackoutDates(params: BulkCreateBlackoutDatesParams) {
    const {
        propertyId,
        startDate,
        endDate,
        reason,
        description,
        roomType,
        bookingSource,
        createdById,
    } = params;

    const startOfStart = new Date(startDate);
    startOfStart.setHours(0, 0, 0, 0);
    const endOfEnd = new Date(endDate);
    endOfEnd.setHours(23, 59, 59, 999);

    const blackoutDates = [];
    let currentDate = new Date(startOfStart);

    while (currentDate <= endOfEnd) {
        const blackoutDate = await createBlackoutDate({
            propertyId,
            date: new Date(currentDate),
            reason,
            description,
            roomType,
            bookingSource,
            createdById,
        });
        blackoutDates.push(blackoutDate.blackoutDate);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
        created: blackoutDates.length,
        blackoutDates: blackoutDates.map(bd => ({
            id: bd.id,
            date: bd.date,
            endDate: bd.endDate,
        })),
    };
}

// ─── Update Blackout Date ────────────────────────────────────────────────

export type UpdateBlackoutDateParams = {
    id: string;
    reason?: BlackoutReason;
    description?: string;
    updatedById?: string;
};

export type UpdateBlackoutDateResult = {
    blackoutDate: {
        id: string;
        date: Date;
        reason: string;
        description: string | null;
    };
};

/**
 * Update a blackout date's reason or description
 */
export async function updateBlackoutDate(params: UpdateBlackoutDateParams) {
    const { id, reason, description, updatedById } = params;

    const updateData: any = {};
    if (reason !== undefined) updateData.reason = reason;
    if (description !== undefined) updateData.description = description;

    const blackoutDate = await prisma.blackoutDate.update({
        where: { id },
        data: updateData,
    });

    // Audit log
    if (updatedById) {
        await prisma.auditLog.create({
            data: {
                userId: updatedById,
                action: 'UPDATE',
                entity: 'blackout_date',
                entityId: id,
                metadata: updateData,
            },
        });
    }

    return {
        blackoutDate: {
            id: blackoutDate.id,
            date: blackoutDate.date,
            reason: blackoutDate.reason,
            description: blackoutDate.description,
        },
    };
}

// ─── Check Booking Against Blackout ──────────────────────────────────────

export type CheckBookingAgainstBlackoutParams = {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    roomType: RoomType;
    bookingSource: BookingSource;
};

export type CheckBookingAgainstBlackoutResult = {
    isAllowed: boolean;
    conflictingDates: Array<{
        date: Date;
        blackoutId: string;
        reason: string;
    }>;
};

/**
 * Check if a booking's date range conflicts with any blackout dates
 */
export async function checkBookingAgainstBlackout(params: CheckBookingAgainstBlackoutParams): Promise<CheckBookingAgainstBlackoutResult> {
    const { propertyId, checkIn, checkOut, roomType, bookingSource } = params;

    const conflictingDates = [];
    let currentDate = new Date(checkIn);
    currentDate.setHours(0, 0, 0, 0);
    const endDate = new Date(checkOut);
    endDate.setHours(0, 0, 0, 0);

    while (currentDate < endDate) {
        const blackoutCheck = await isDateBlackout({
            propertyId,
            date: currentDate,
            roomType,
            bookingSource,
        });

        if (blackoutCheck.isBlackout && blackoutCheck.blackoutDate) {
            conflictingDates.push({
                date: new Date(currentDate),
                blackoutId: blackoutCheck.blackoutDate.id,
                reason: blackoutCheck.blackoutDate.reason,
            });
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
        isAllowed: conflictingDates.length === 0,
        conflictingDates,
    };
}
