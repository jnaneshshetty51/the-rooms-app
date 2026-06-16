import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * ─── Booking Recovery Queries ────────────────────────────────────────────────
 *
 * Functions for searching and recovering lost bookings.
 * Scenario 74: Lost booking recovery
 */

// ─── Search ────────────────────────────────────────────────────────────────────

/**
 * Search for lost bookings by various criteria
 */
export async function searchLostBookings(criteria: {
    guestName?: string;
    phone?: string;
    email?: string;
    bookingNumber?: string;
    checkInFrom?: Date;
    checkInTo?: Date;
    page?: number;
    perPage?: number;
}) {
    const {
        guestName,
        phone,
        email,
        bookingNumber,
        checkInFrom,
        checkInTo,
        page = 1,
        perPage = 20,
    } = criteria;

    // Build guest search conditions
    const guestWhere: Prisma.GuestWhereInput = {};
    if (guestName) {
        guestWhere.name = { contains: guestName, mode: 'insensitive' };
    }
    if (phone) {
        guestWhere.phone = { contains: phone };
    }
    if (email) {
        guestWhere.email = { contains: email, mode: 'insensitive' };
    }

    // Build booking search conditions
    const bookingWhere: Prisma.BookingWhereInput = {};
    if (bookingNumber) {
        bookingWhere.bookingNumber = { contains: bookingNumber };
    }
    if (checkInFrom || checkInTo) {
        bookingWhere.checkIn = {};
        if (checkInFrom) bookingWhere.checkIn.gte = checkInFrom;
        if (checkInTo) bookingWhere.checkIn.lte = checkInTo;
    }

    // Find guests matching criteria
    const guests = await prisma.guest.findMany({
        where: guestWhere,
        select: { id: true },
    });
    const guestIds = guests.map((g) => g.id);

    // Find lost bookings
    const where: Prisma.LostBookingWhereInput = {};
    if (guestIds.length > 0) {
        where.booking = {
            guestId: { in: guestIds },
            ...bookingWhere,
        };
    } else if (Object.keys(bookingWhere).length > 0) {
        where.booking = bookingWhere;
    }

    const [lostBookings, total] = await Promise.all([
        prisma.lostBooking.findMany({
            where,
            include: {
                booking: {
                    include: {
                        guest: { select: { id: true, name: true, phone: true, email: true } },
                        room: { select: { roomNumber: true, type: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.lostBooking.count({ where }),
    ]);

    return { lostBookings, total, pages: Math.ceil(total / perPage), page };
}

// ─── Mark as Lost ────────────────────────────────────────────────────────────

/**
 * Mark a booking as lost
 */
export async function markBookingAsLost(
    bookingId: string,
    reason: string,
    description?: string,
    propertyId: string = 'default'
) {
    return prisma.lostBooking.create({
        data: {
            bookingId,
            reason,
            description,
            propertyId,
        },
        include: {
            booking: {
                include: {
                    guest: { select: { id: true, name: true, phone: true } },
                    room: { select: { roomNumber: true } },
                },
            },
        },
    });
}

// ─── Recover ─────────────────────────────────────────────────────────────────

/**
 * Recover a lost booking
 */
export async function recoverBooking(
    lostBookingId: string,
    recoveryAction: 'REACTIVATED' | 'REFUNDED' | 'REBOOKED' | 'MERGED' | 'CANCELLED',
    recoveredById: string,
    linkedBookingId?: string
) {
    const lostBooking = await prisma.lostBooking.update({
        where: { id: lostBookingId },
        data: {
            recoveryAction,
            recoveredAt: new Date(),
            recoveredById,
            linkedBookingId,
        },
        include: {
            booking: {
                include: {
                    guest: { select: { id: true, name: true, phone: true } },
                    room: { select: { roomNumber: true } },
                },
            },
        },
    });

    // If recovered by reactivation, update booking status
    if (recoveryAction === 'REACTIVATED') {
        await prisma.booking.update({
            where: { id: lostBooking.bookingId },
            data: { status: 'CONFIRMED' },
        });
    }

    // If recovered by cancellation, update booking status
    if (recoveryAction === 'CANCELLED') {
        await prisma.booking.update({
            where: { id: lostBooking.bookingId },
            data: { status: 'CANCELLED' },
        });
    }

    return lostBooking;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Get lost bookings for a property
 */
export async function getLostBookings(
    propertyId: string = 'default',
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    perPage: number = 20
) {
    const where: Prisma.LostBookingWhereInput = { propertyId };
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const [lostBookings, total] = await Promise.all([
        prisma.lostBooking.findMany({
            where,
            include: {
                booking: {
                    include: {
                        guest: { select: { id: true, name: true, phone: true } },
                        room: { select: { roomNumber: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.lostBooking.count({ where }),
    ]);

    return { lostBookings, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Get a single lost booking by ID
 */
export async function getLostBookingById(lostBookingId: string) {
    return prisma.lostBooking.findUnique({
        where: { id: lostBookingId },
        include: {
            booking: {
                include: {
                    guest: { select: { id: true, name: true, phone: true, email: true } },
                    room: { select: { roomNumber: true, type: true } },
                    payments: true,
                    invoice: true,
                },
            },
        },
    });
}

// ─── Duplicate Detection ─────────────────────────────────────────────────────

/**
 * Identify potential duplicate bookings for the same guest
 */
export async function identifyDuplicateBookings(guestId: string) {
    // Get all bookings for this guest
    const bookings = await prisma.booking.findMany({
        where: { guestId },
        include: {
            guest: { select: { id: true, name: true, phone: true } },
            room: { select: { roomNumber: true, type: true } },
        },
        orderBy: { checkIn: 'desc' },
    });

    if (bookings.length < 2) {
        return { duplicates: [], totalBookings: bookings.length };
    }

    const duplicates: Array<{
        booking1: typeof bookings[0];
        booking2: typeof bookings[0];
        matchType: string;
        matchScore: number;
    }> = [];

    // Check for date overlaps (same guest, overlapping dates, different rooms)
    for (let i = 0; i < bookings.length - 1; i++) {
        for (let j = i + 1; j < bookings.length; j++) {
            const b1 = bookings[i];
            const b2 = bookings[j];

            // Check for date overlap
            if (b1.checkIn < b2.checkOut && b2.checkIn < b1.checkOut) {
                duplicates.push({
                    booking1: b1,
                    booking2: b2,
                    matchType: 'DATE_OVERLAP',
                    matchScore: 100,
                });
            }
            // Check for same dates but different rooms
            else if (
                b1.checkIn.getTime() === b2.checkIn.getTime() &&
                b1.checkOut.getTime() === b2.checkOut.getTime() &&
                b1.roomId !== b2.roomId
            ) {
                duplicates.push({
                    booking1: b1,
                    booking2: b2,
                    matchType: 'SAME_DATES_DIFFERENT_ROOM',
                    matchScore: 80,
                });
            }
            // Check for consecutive bookings (potential double-booking)
            else if (
                Math.abs(b1.checkIn.getTime() - b2.checkOut.getTime()) < 24 * 60 * 60 * 1000 ||
                Math.abs(b2.checkIn.getTime() - b1.checkOut.getTime()) < 24 * 60 * 60 * 1000
            ) {
                duplicates.push({
                    booking1: b1,
                    booking2: b2,
                    matchType: 'CONSECUTIVE_BOOKING',
                    matchScore: 50,
                });
            }
        }
    }

    return {
        duplicates,
        totalBookings: bookings.length,
        uniqueRooms: [...new Set(bookings.map((b) => b.roomId))].length,
    };
}

/**
 * Merge duplicate bookings
 */
export async function mergeDuplicateBookings(
    bookingId1: string,
    bookingId2: string,
    primaryBookingId: string,
    mergedById: string
) {
    // Determine which booking to keep and which to cancel
    const secondaryBookingId = primaryBookingId === bookingId1 ? bookingId2 : bookingId1;

    return prisma.$transaction(async (tx) => {
        // Cancel the secondary booking
        await tx.booking.update({
            where: { id: secondaryBookingId },
            data: { status: 'CANCELLED' },
        });

        // Create audit logs for both
        await tx.auditLog.create({
            data: {
                userId: mergedById,
                bookingId: secondaryBookingId,
                action: 'MERGED',
                entity: 'booking',
                entityId: secondaryBookingId,
                metadata: {
                    mergedInto: primaryBookingId,
                    reason: 'Duplicate booking merged',
                },
            },
        });

        await tx.auditLog.create({
            data: {
                userId: mergedById,
                bookingId: primaryBookingId,
                action: 'MERGE_PRIMARY',
                entity: 'booking',
                entityId: primaryBookingId,
                metadata: {
                    mergedFrom: secondaryBookingId,
                },
            },
        });

        // Mark the lost booking record if exists
        await tx.lostBooking.updateMany({
            where: { bookingId: secondaryBookingId },
            data: {
                recoveryAction: 'MERGED',
                recoveredAt: new Date(),
                recoveredById: mergedById,
                linkedBookingId: primaryBookingId,
            },
        });

        // Return the primary booking
        return tx.booking.findUnique({
            where: { id: primaryBookingId },
            include: {
                guest: { select: { id: true, name: true, phone: true } },
                room: { select: { roomNumber: true, type: true } },
                payments: true,
            },
        });
    });
}
