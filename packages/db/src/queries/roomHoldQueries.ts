import prisma from '../index';
import { Prisma, RoomHoldType, RoomHoldStatus } from '@prisma/client';

export type CreateRoomHoldData = {
    roomId: string;
    holdType: RoomHoldType;
    bookingId?: string;
    waitlistId?: string;
    checkIn: Date;
    checkOut: Date;
    expiresAt: Date;
};

/**
 * Create a room hold (prevents double-booking)
 */
export async function createRoomHold(data: CreateRoomHoldData) {
    return prisma.roomHold.create({
        data: {
            roomId: data.roomId,
            holdType: data.holdType,
            bookingId: data.bookingId,
            waitlistId: data.waitlistId,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            expiresAt: data.expiresAt,
            status: 'ACTIVE',
        },
    });
}

/**
 * Release a room hold
 */
export async function releaseRoomHold(id: string) {
    return prisma.roomHold.update({
        where: { id },
        data: {
            status: 'RELEASED',
            releasedAt: new Date(),
        },
    });
}

/**
 * Release all active holds for a booking
 */
export async function releaseRoomHoldByBooking(bookingId: string) {
    return prisma.roomHold.updateMany({
        where: {
            bookingId,
            status: 'ACTIVE',
        },
        data: {
            status: 'RELEASED',
            releasedAt: new Date(),
        },
    });
}

/**
 * Get active room hold for a specific room and date range
 */
export async function getActiveRoomHold(
    roomId: string,
    checkIn: Date,
    checkOut: Date
) {
    return prisma.roomHold.findFirst({
        where: {
            roomId,
            status: 'ACTIVE',
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
        },
    });
}

/**
 * Get all active room holds
 */
export async function getActiveRoomHolds(propertyId?: string) {
    return prisma.roomHold.findMany({
        where: {
            status: 'ACTIVE',
            room: propertyId ? { propertyId } : undefined,
            expiresAt: { gt: new Date() },
        },
        include: {
            room: true,
        },
        orderBy: {
            expiresAt: 'asc',
        },
    });
}

/**
 * Cleanup expired holds (run as a scheduled job)
 */
export async function cleanupExpiredHolds() {
    const result = await prisma.roomHold.updateMany({
        where: {
            status: 'ACTIVE',
            expiresAt: { lt: new Date() },
        },
        data: {
            status: 'EXPIRED',
            releasedAt: new Date(),
        },
    });

    return { expiredCount: result.count };
}

/**
 * Convert a room hold to a booking (when waitlist converts)
 */
export async function convertRoomHold(id: string, bookingId: string) {
    return prisma.roomHold.update({
        where: { id },
        data: {
            status: 'CONVERTED',
            bookingId,
            releasedAt: new Date(),
        },
    });
}

/**
 * Get room hold by ID
 */
export async function getRoomHoldById(id: string) {
    return prisma.roomHold.findUnique({
        where: { id },
        include: {
            room: true,
        },
    });
}

/**
 * Get room holds for a booking
 */
export async function getRoomHoldsByBooking(bookingId: string) {
    return prisma.roomHold.findMany({
        where: { bookingId },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Extend a room hold expiry
 */
export async function extendRoomHold(id: string, newExpiresAt: Date) {
    return prisma.roomHold.update({
        where: { id },
        data: {
            expiresAt: newExpiresAt,
        },
    });
}