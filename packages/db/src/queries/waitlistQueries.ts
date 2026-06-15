import prisma from '../index';
import { Prisma, RoomType, WaitlistStatus } from '@prisma/client';

/**
 * Generate a unique waitlist number: WTL-YYYYMMDD-XXXX
 */
export async function generateWaitlistNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `WTL-${dateStr}-`;

    // Find the highest count for today
    const lastEntry = await prisma.waitlist.findFirst({
        where: { waitlistNumber: { startsWith: prefix } },
        orderBy: { waitlistNumber: 'desc' },
        select: { waitlistNumber: true },
    });

    let counter = 1;
    if (lastEntry) {
        const lastCounter = parseInt(lastEntry.waitlistNumber.split('-').pop() ?? '0', 10);
        counter = lastCounter + 1;
    }

    return `${prefix}${String(counter).padStart(4, '0')}`;
}

export type CreateWaitlistData = {
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    roomType: RoomType;
    checkIn: Date;
    checkOut: Date;
    guestsCount?: number;
    priority?: number;
    propertyId?: string;
};

/**
 * Add a guest to the waitlist
 */
export async function addToWaitlist(data: CreateWaitlistData) {
    const waitlistNumber = await generateWaitlistNumber();

    // Default expiry: 24 hours from creation
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return prisma.waitlist.create({
        data: {
            waitlistNumber,
            propertyId: data.propertyId || 'default',
            guestName: data.guestName,
            guestPhone: data.guestPhone,
            guestEmail: data.guestEmail,
            roomType: data.roomType,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            guestsCount: data.guestsCount || 1,
            priority: data.priority || 0,
            status: 'WAITING',
            expiresAt,
        },
    });
}

/**
 * Remove a guest from the waitlist
 */
export async function removeFromWaitlist(id: string, reason?: string) {
    return prisma.waitlist.update({
        where: { id },
        data: {
            status: 'CANCELLED',
            resolvedAt: new Date(),
            resolvedReason: reason,
        },
    });
}

/**
 * Get waitlist with filters
 */
export async function getWaitlist(filters: {
    status?: WaitlistStatus;
    roomType?: RoomType;
    propertyId?: string;
    page?: number;
    perPage?: number;
} = {}) {
    const {
        status,
        roomType,
        propertyId,
        page = 1,
        perPage = 20,
    } = filters;

    const where: Prisma.WaitlistWhereInput = {};
    if (status) where.status = status;
    if (roomType) where.roomType = roomType;
    if (propertyId) where.propertyId = propertyId;

    const [entries, total] = await Promise.all([
        prisma.waitlist.findMany({
            where,
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' },
            ],
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.waitlist.count({ where }),
    ]);

    return { entries, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Get waitlist entries by room type for a specific date range
 */
export async function getWaitlistByRoomType(
    roomType: RoomType,
    checkIn: Date,
    checkOut: Date
) {
    return prisma.waitlist.findMany({
        where: {
            roomType,
            status: 'WAITING',
            checkIn: { lte: checkIn },
            checkOut: { gte: checkOut },
            expiresAt: { gt: new Date() },
        },
        orderBy: [
            { priority: 'desc' },
            { createdAt: 'asc' },
        ],
    });
}

/**
 * Notify the next person in the waitlist when a room becomes available
 */
export async function notifyNextInWaitlist(
    roomType: RoomType,
    checkIn: Date,
    checkOut: Date
): Promise<{ success: boolean; entry?: { id: string; waitlistNumber: string; guestName: string; guestPhone: string } }> {
    // Find first matching waitlist entry
    const entry = await prisma.waitlist.findFirst({
        where: {
            roomType,
            status: 'WAITING',
            checkIn: { lte: checkIn },
            checkOut: { gte: checkOut },
            expiresAt: { gt: new Date() },
        },
        orderBy: [
            { priority: 'desc' },
            { createdAt: 'asc' },
        ],
    });

    if (!entry) {
        return { success: false };
    }

    // Update status to NOTIFIED
    await prisma.waitlist.update({
        where: { id: entry.id },
        data: {
            status: 'NOTIFIED',
            notifiedAt: new Date(),
        },
    });

    return {
        success: true,
        entry: {
            id: entry.id,
            waitlistNumber: entry.waitlistNumber,
            guestName: entry.guestName,
            guestPhone: entry.guestPhone,
        },
    };
}

/**
 * Convert a waitlist entry to a booking
 */
export async function convertWaitlistToBooking(
    waitlistId: string,
    bookingId: string
) {
    return prisma.waitlist.update({
        where: { id: waitlistId },
        data: {
            status: 'CONVERTED',
            resolvedAt: new Date(),
            resolvedBookingId: bookingId,
            resolvedReason: 'Converted to booking',
        },
    });
}

/**
 * Mark a waitlist entry as expired
 */
export async function expireWaitlistEntry(id: string) {
    return prisma.waitlist.update({
        where: { id },
        data: {
            status: 'EXPIRED',
            resolvedAt: new Date(),
            resolvedReason: 'Entry expired',
        },
    });
}

/**
 * Get a single waitlist entry by ID
 */
export async function getWaitlistById(id: string) {
    return prisma.waitlist.findUnique({
        where: { id },
    });
}