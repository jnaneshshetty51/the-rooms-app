import prisma from '../index';
import { GroupBookingStatus, GroupBillingType } from '@prisma/client';

/**
 * ─── Group Booking Queries ───────────────────────────────────────────────────
 *
 * Functions for managing group bookings (corporate, weddings, etc.)
 */

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Create a new group booking
 */
export async function createGroupBooking(data: {
    name: string;
    propertyId?: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    billingType?: GroupBillingType;
    checkInDate: Date;
    checkOutDate: Date;
    createdById?: string;
}) {
    const { name, propertyId = 'default', contactPerson, contactPhone, contactEmail, billingType = 'INDIVIDUAL', checkInDate, checkOutDate, createdById } = data;

    // Generate group code
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `GRP-${dateStr}-`;

    const lastGroup = await prisma.groupBooking.findFirst({
        where: { groupCode: { startsWith: prefix } },
        orderBy: { groupCode: 'desc' },
        select: { groupCode: true },
    });

    let counter = 1;
    if (lastGroup) {
        const lastCounter = parseInt(lastGroup.groupCode.split('-').pop() ?? '0', 10);
        counter = lastCounter + 1;
    }

    const groupCode = `${prefix}${String(counter).padStart(4, '0')}`;

    return prisma.groupBooking.create({
        data: {
            groupCode,
            name,
            propertyId,
            contactPerson,
            contactPhone,
            contactEmail,
            billingType,
            checkInDate,
            checkOutDate,
            createdById,
            status: 'CONFIRMED',
        },
        include: {
            property: { select: { id: true, name: true } },
            bookings: {
                include: {
                    guest: { select: { name: true, phone: true } },
                    room: { select: { roomNumber: true, type: true } },
                },
            },
        },
    });
}

/**
 * Add a booking to an existing group
 */
export async function addBookingToGroup(
    bookingId: string,
    groupBookingId: string
) {
    return prisma.booking.update({
        where: { id: bookingId },
        data: { groupBookingId },
        include: {
            guest: { select: { name: true } },
            room: { select: { roomNumber: true } },
        },
    });
}

/**
 * Remove a booking from a group
 */
export async function removeBookingFromGroup(bookingId: string) {
    return prisma.booking.update({
        where: { id: bookingId },
        data: { groupBookingId: null },
    });
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Get group booking by ID
 */
export async function getGroupBookingById(id: string) {
    return prisma.groupBooking.findUnique({
        where: { id },
        include: {
            property: { select: { id: true, name: true } },
            bookings: {
                include: {
                    guest: { select: { id: true, name: true, phone: true } },
                    room: { select: { id: true, roomNumber: true, type: true } },
                    payments: { select: { id: true, amount: true, status: true } },
                },
            },
            createdBy: { select: { id: true, name: true } },
        },
    });
}

/**
 * Get group booking by code
 */
export async function getGroupBookingByCode(groupCode: string) {
    return prisma.groupBooking.findUnique({
        where: { groupCode },
        include: {
            bookings: {
                include: {
                    guest: { select: { name: true } },
                    room: { select: { roomNumber: true } },
                },
            },
        },
    });
}

/**
 * Get all group bookings with filters
 */
export async function getGroupBookings(options: {
    propertyId?: string;
    status?: GroupBookingStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    perPage?: number;
} = {}) {
    const { propertyId, status, startDate, endDate, page = 1, perPage = 20 } = options;

    const where: any = {};
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;
    if (startDate || endDate) {
        where.checkInDate = {};
        if (startDate) where.checkInDate.gte = startDate;
        if (endDate) where.checkInDate.lte = endDate;
    }

    const [groups, total] = await Promise.all([
        prisma.groupBooking.findMany({
            where,
            include: {
                bookings: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        status: true,
                        guest: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.groupBooking.count({ where }),
    ]);

    return { groups, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Get group booking statistics
 */
export async function getGroupBookingStats(propertyId: string = 'default') {
    const groups = await prisma.groupBooking.findMany({
        where: { propertyId },
        select: {
            id: true,
            status: true,
            checkInDate: true,
            checkOutDate: true,
            bookings: {
                select: {
                    id: true,
                    totalAmount: true,
                    paymentStatus: true,
                },
            },
        },
    });

    const stats = {
        total: groups.length,
        confirmed: groups.filter(g => g.status === 'CONFIRMED').length,
        inProgress: groups.filter(g => g.status === 'IN_PROGRESS').length,
        completed: groups.filter(g => g.status === 'COMPLETED').length,
        cancelled: groups.filter(g => g.status === 'CANCELLED').length,
        totalBookings: groups.reduce((sum, g) => sum + g.bookings.length, 0),
        totalRevenue: groups.reduce(
            (sum, g) => sum + g.bookings.reduce((s, b) => s + b.totalAmount.toNumber(), 0),
            0
        ),
    };

    return stats;
}

// ─── Update ────────────────────────────────────────────────────────────────────

/**
 * Update group booking status
 */
export async function updateGroupBookingStatus(
    id: string,
    status: GroupBookingStatus
) {
    return prisma.groupBooking.update({
        where: { id },
        data: { status },
        include: {
            bookings: {
                select: { id: true, status: true },
            },
        },
    });
}

/**
 * Update group booking details
 */
export async function updateGroupBooking(
    id: string,
    data: {
        name?: string;
        contactPerson?: string;
        contactPhone?: string;
        contactEmail?: string;
        billingType?: GroupBillingType;
    }
) {
    return prisma.groupBooking.update({
        where: { id },
        data,
    });
}

/**
 * Cancel entire group (cancels all bookings)
 */
export async function cancelGroupBooking(id: string, reason: string) {
    const group = await prisma.groupBooking.findUnique({
        where: { id },
        include: { bookings: { select: { id: true, status: true } } },
    });

    if (!group) throw new Error('Group booking not found');

    // Update group status
    await prisma.groupBooking.update({
        where: { id },
        data: { status: 'CANCELLED' },
    });

    // Cancel all confirmed bookings
    const confirmedBookings = group.bookings
        .filter(b => b.status === 'CONFIRMED')
        .map(b => b.id);

    await prisma.booking.updateMany({
        where: { id: { in: confirmedBookings } },
        data: {
            status: 'CANCELLED',
            specialRequests: `Group cancellation: ${reason}`,
        },
    });

    return { cancelledBookings: confirmedBookings.length };
}

// ─── Bulk Operations ─────────────────────────────────────────────────────────

/**
 * Bulk check-in all bookings in a group
 */
export async function bulkCheckinGroup(groupId: string, initiatedById: string) {
    const group = await prisma.groupBooking.findUnique({
        where: { id: groupId },
        include: {
            bookings: {
                where: { status: 'CONFIRMED' },
                select: { id: true, roomId: true, room: { select: { status: true } } },
            },
        },
    });

    if (!group) throw new Error('Group booking not found');

    const results = [];
    const errors = [];

    for (const booking of group.bookings) {
        if (booking.room.status !== 'VACANT') {
            errors.push(`Room for booking ${booking.id} is not vacant`);
            continue;
        }

        try {
            await prisma.$transaction([
                prisma.booking.update({
                    where: { id: booking.id },
                    data: { status: 'CHECKED_IN', checkInTime: new Date() },
                }),
                prisma.room.update({
                    where: { id: booking.roomId },
                    data: { status: 'OCCUPIED' },
                }),
            ]);
            results.push(booking.id);
        } catch (e) {
            errors.push(`Failed to check-in booking ${booking.id}: ${(e as Error).message}`);
        }
    }

    // Update group status if all checked in
    if (results.length === group.bookings.length) {
        await prisma.groupBooking.update({
            where: { id: groupId },
            data: { status: 'IN_PROGRESS' },
        });
    }

    return { checkedIn: results.length, failed: errors.length, errors };
}

/**
 * Bulk check-out all bookings in a group
 */
export async function bulkCheckoutGroup(groupId: string, initiatedById: string) {
    const group = await prisma.groupBooking.findUnique({
        where: { id: groupId },
        include: {
            bookings: {
                where: { status: 'CHECKED_IN' },
                select: { id: true, roomId: true },
            },
        },
    });

    if (!group) throw new Error('Group booking not found');

    const results = [];
    const errors = [];

    for (const booking of group.bookings) {
        try {
            await prisma.$transaction([
                prisma.booking.update({
                    where: { id: booking.id },
                    data: { status: 'CHECKED_OUT', checkOutTime: new Date() },
                }),
                prisma.room.update({
                    where: { id: booking.roomId },
                    data: { status: 'VACANT' },
                }),
            ]);
            results.push(booking.id);
        } catch (e) {
            errors.push(`Failed to check-out booking ${booking.id}: ${(e as Error).message}`);
        }
    }

    // Update group status
    await prisma.groupBooking.update({
        where: { id: groupId },
        data: { status: 'COMPLETED' },
    });

    return { checkedOut: results.length, failed: errors.length, errors };
}
