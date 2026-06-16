import prisma from '../index';
import { RoomType } from '@prisma/client';

/**
 * ─── Room Type Inventory Queries (Scenario 47) ───────────────────────────
 *
 * Functions for room type inventory management:
 * - Adjust room type inventory
 * - Get room type inventory for date range
 * - Set specific inventory count
 */

// ─── Inventory Adjustment ──────────────────────────────────────────────────

export type InventoryAdjustmentType = 'BLOCK' | 'RELEASE' | 'MANUAL_ADJUSTMENT' | 'MAINTENANCE' | 'OTA_SYNC';

export type AdjustRoomTypeInventoryParams = {
    propertyId: string;
    roomType: RoomType;
    date: Date;
    adjustment: number; // positive = add availability, negative = reduce availability
    reason: InventoryAdjustmentType;
    notes?: string;
    adjustedById?: string;
};

export type AdjustRoomTypeInventoryResult = {
    date: Date;
    roomType: RoomType;
    previousCount: number;
    adjustment: number;
    newCount: number;
    reason: string;
};

/**
 * Adjust room type inventory for a specific date
 * Positive adjustment = more rooms available
 * Negative adjustment = fewer rooms available (blocks)
 */
export async function adjustRoomTypeInventory(params: AdjustRoomTypeInventoryParams) {
    const {
        propertyId,
        roomType,
        date,
        adjustment,
        reason,
        notes,
        adjustedById,
    } = params;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    return prisma.$transaction(async (tx) => {
        // Get or create inventory snapshot for this date
        const existingSnapshot = await tx.inventorySnapshot.findFirst({
            where: {
                channelId: 'PMS',
                roomId: roomType, // Using roomId as roomType identifier
                date: startOfDay,
            },
        });

        const totalRooms = await tx.room.count({
            where: {
                type: roomType,
                propertyId,
                status: { not: 'MAINTENANCE' },
            },
        });

        const bookedRooms = await tx.booking.count({
            where: {
                propertyId,
                room: { type: roomType },
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                checkIn: { lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1) },
                checkOut: { gt: startOfDay },
            },
        });

        const baseAvailable = totalRooms - bookedRooms;
        const previousCount = existingSnapshot?.availableRooms || baseAvailable;
        const newCount = Math.max(0, previousCount + adjustment);

        // Create or update snapshot
        const snapshot = existingSnapshot
            ? await tx.inventorySnapshot.update({
                where: { id: existingSnapshot.id },
                data: {
                    availableRooms: newCount,
                    version: { increment: 1 },
                },
            })
            : await tx.inventorySnapshot.create({
                data: {
                    channelId: 'PMS',
                    roomId: roomType,
                    date: startOfDay,
                    availableRooms: newCount,
                    totalRooms,
                    source: 'PMS',
                },
            });

        // Create audit log entry
        await tx.auditLog.create({
            data: {
                userId: adjustedById,
                action: 'INVENTORY_ADJUSTED',
                entity: 'room',
                entityId: roomType,
                metadata: {
                    propertyId,
                    roomType,
                    date: startOfDay.toISOString(),
                    previousCount,
                    adjustment,
                    newCount,
                    reason,
                    notes,
                },
            },
        });

        return {
            date: startOfDay,
            roomType,
            previousCount,
            adjustment,
            newCount,
            reason,
        };
    });
}

// ─── Get Room Type Inventory ──────────────────────────────────────────────

export type GetRoomTypeInventoryParams = {
    propertyId: string;
    roomType: RoomType;
    startDate: Date;
    endDate: Date;
};

export type InventorySnapshot = {
    date: Date;
    totalRooms: number;
    bookedRooms: number;
    availableRooms: number;
    isBlocked: boolean;
    blockReason?: string;
};

export type GetRoomTypeInventoryResult = {
    roomType: RoomType;
    startDate: Date;
    endDate: Date;
    snapshots: InventorySnapshot[];
    totalAvailable: number;
    averageOccupancy: number;
};

/**
 * Get inventory for a room type over a date range
 */
export async function getRoomTypeInventory(params: GetRoomTypeInventoryParams) {
    const { propertyId, roomType, startDate, endDate } = params;

    const startOfStart = new Date(startDate);
    startOfStart.setHours(0, 0, 0, 0);
    const endOfEnd = new Date(endDate);
    endOfEnd.setHours(23, 59, 59, 999);

    // Get total rooms of this type
    const totalRooms = await prisma.room.count({
        where: {
            type: roomType,
            propertyId,
            status: { not: 'MAINTENANCE' },
        },
    });

    // Get all bookings in range
    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            room: { type: roomType },
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            OR: [
                {
                    checkIn: { lte: endOfEnd },
                    checkOut: { gt: startOfStart },
                },
            ],
        },
        select: {
            checkIn: true,
            checkOut: true,
        },
    });

    // Get inventory snapshots (manual adjustments)
    const snapshots = await prisma.inventorySnapshot.findMany({
        where: {
            channelId: 'PMS',
            roomId: roomType,
            date: {
                gte: startOfStart,
                lte: endOfEnd,
            },
        },
        orderBy: { date: 'asc' },
    });

    // Generate date-by-date inventory
    const dateSnapshots: InventorySnapshot[] = [];
    let currentDate = new Date(startOfStart);
    let totalAvailable = 0;

    while (currentDate <= endOfEnd) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Count bookings for this day
        const bookedForDay = bookings.filter(b => b.checkIn <= dayEnd && b.checkOut > dayStart).length;
        const baseAvailable = totalRooms - bookedForDay;

        // Check for manual adjustment
        const snapshot = snapshots.find(s => s.date.getTime() === dayStart.getTime());
        const availableRooms = snapshot?.availableRooms || baseAvailable;
        const isBlocked = availableRooms < baseAvailable;

        dateSnapshots.push({
            date: dayStart,
            totalRooms,
            bookedRooms: bookedForDay,
            availableRooms,
            isBlocked,
            blockReason: isBlocked ? 'Manual adjustment' : undefined,
        });

        totalAvailable += availableRooms;
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const daysCount = dateSnapshots.length;
    const averageOccupancy = daysCount > 0
        ? ((totalRooms * daysCount - totalAvailable) / (totalRooms * daysCount)) * 100
        : 0;

    return {
        roomType,
        startDate: startOfStart,
        endDate: endOfEnd,
        snapshots: dateSnapshots,
        totalAvailable,
        averageOccupancy: Math.round(averageOccupancy * 100) / 100,
    };
}

// ─── Set Room Type Inventory ───────────────────────────────────────────────

export type SetRoomTypeInventoryParams = {
    propertyId: string;
    roomType: RoomType;
    date: Date;
    count: number;
    reason?: string;
    setById?: string;
};

export type SetRoomTypeInventoryResult = {
    date: Date;
    roomType: RoomType;
    previousAvailable: number;
    newAvailable: number;
    totalRooms: number;
};

/**
 * Set specific inventory count for a room type on a date
 */
export async function setRoomTypeInventory(params: SetRoomTypeInventoryParams) {
    const { propertyId, roomType, date, count, reason, setById } = params;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    return prisma.$transaction(async (tx) => {
        // Get total rooms
        const totalRooms = await tx.room.count({
            where: {
                type: roomType,
                propertyId,
                status: { not: 'MAINTENANCE' },
            },
        });

        // Get current booked count
        const bookedRooms = await tx.booking.count({
            where: {
                propertyId,
                room: { type: roomType },
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                checkIn: { lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1) },
                checkOut: { gt: startOfDay },
            },
        });

        const baseAvailable = totalRooms - bookedRooms;

        // Get existing snapshot
        const existingSnapshot = await tx.inventorySnapshot.findFirst({
            where: {
                channelId: 'PMS',
                roomId: roomType,
                date: startOfDay,
            },
        });

        const previousAvailable = existingSnapshot?.availableRooms || baseAvailable;

        // Create or update snapshot
        const snapshot = existingSnapshot
            ? await tx.inventorySnapshot.update({
                where: { id: existingSnapshot.id },
                data: {
                    availableRooms: count,
                    version: { increment: 1 },
                },
            })
            : await tx.inventorySnapshot.create({
                data: {
                    channelId: 'PMS',
                    roomId: roomType,
                    date: startOfDay,
                    availableRooms: count,
                    totalRooms,
                    source: 'PMS',
                },
            });

        // Audit log
        await tx.auditLog.create({
            data: {
                userId: setById,
                action: 'INVENTORY_SET',
                entity: 'room',
                entityId: roomType,
                metadata: {
                    propertyId,
                    roomType,
                    date: startOfDay.toISOString(),
                    previousAvailable,
                    newAvailable: count,
                    reason: reason || 'Manual set',
                },
            },
        });

        return {
            date: startOfDay,
            roomType,
            previousAvailable,
            newAvailable: count,
            totalRooms,
        };
    });
}

// ─── Bulk Inventory Operations ────────────────────────────────────────────

/**
 * Block multiple dates for a room type
 */
export async function blockRoomTypeDates(
    propertyId: string,
    roomType: RoomType,
    startDate: Date,
    endDate: Date,
    reason: InventoryAdjustmentType,
    notes?: string,
    blockedById?: string
) {
    const results = [];
    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999);

    while (currentDate <= endDateObj) {
        const result = await adjustRoomTypeInventory({
            propertyId,
            roomType,
            date: new Date(currentDate),
            adjustment: -1, // Reduce by 1
            reason,
            notes,
            adjustedById: blockedById,
        });
        results.push(result);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
}

/**
 * Release blocked dates for a room type
 */
export async function releaseRoomTypeDates(
    propertyId: string,
    roomType: RoomType,
    startDate: Date,
    endDate: Date,
    reason: string,
    releasedById?: string
) {
    const results = [];
    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999);

    while (currentDate <= endDateObj) {
        const result = await adjustRoomTypeInventory({
            propertyId,
            roomType,
            date: new Date(currentDate),
            adjustment: 1, // Add back 1
            reason: 'RELEASE',
            notes: reason,
            adjustedById: releasedById,
        });
        results.push(result);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
}

// ─── Inventory Availability Check ─────────────────────────────────────────

/**
 * Quick check if rooms are available for a date range
 */
export async function checkInventoryAvailability(
    propertyId: string,
    roomType: RoomType,
    checkIn: Date,
    checkOut: Date,
    requiredCount: number = 1
): Promise<{
    available: boolean;
    availableRooms: number;
    totalRooms: number;
    conflictingDates: Array<{ date: Date; booked: number }>;
}> {
    const totalRooms = await prisma.room.count({
        where: {
            type: roomType,
            propertyId,
            status: { not: 'MAINTENANCE' },
        },
    });

    const conflictingDates = [];
    let currentDate = new Date(checkIn);
    let minAvailable = Infinity;

    while (currentDate < checkOut) {
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const booked = await prisma.booking.count({
            where: {
                propertyId,
                room: { type: roomType },
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                checkIn: { lte: dayEnd },
                checkOut: { gt: currentDate },
            },
        });

        const available = totalRooms - booked;
        if (available < minAvailable) {
            minAvailable = available;
        }

        if (available < requiredCount) {
            conflictingDates.push({ date: new Date(currentDate), booked });
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
        available: minAvailable >= requiredCount,
        availableRooms: minAvailable === Infinity ? totalRooms : minAvailable,
        totalRooms,
        conflictingDates,
    };
}
