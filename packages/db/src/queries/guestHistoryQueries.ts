// packages/db/src/queries/guestHistoryQueries.ts
// Guest history & preferences tracking - Scenario 80

import prisma from '../index';
import { Prisma, RoomType, NotificationChannel } from '@prisma/client';

export type GuestTag = 'VIP' | 'REGULAR' | 'PROBLEM' | 'LONG_STAY' | 'CORPORATE' | 'HONEYMOON' | 'BIRTHDAY' | 'TRAVEL_AGENT' | 'OTA_GUEST';

/**
 * Get guest preferences
 */
export async function getGuestPreferences(guestId: string) {
    let preferences = await prisma.guestPreference.findUnique({
        where: { guestId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
        preferences = await prisma.guestPreference.create({
            data: {
                guestId,
                preferredRoomNumbers: [],
                avoidRoomNumbers: [],
                preferredAmenities: [],
                dislikedAmenities: [],
                dietaryRestrictions: [],
                isVegetarian: false,
                hasAllergies: false,
            },
        });
    }

    return preferences;
}

/**
 * Update guest preferences
 */
export async function updateGuestPreferences(
    guestId: string,
    data: Partial<{
        preferredRoomType: RoomType;
        preferredFloor: number;
        preferredRoomNumbers: string[];
        avoidRoomNumbers: string[];
        preferredBedding: string;
        preferredAmenities: string[];
        dislikedAmenities: string[];
        dietaryRestrictions: string[];
        preferredChannel: NotificationChannel;
        notes: string;
        isVegetarian: boolean;
        hasAllergies: boolean;
        allergyDetails: string;
    }>
) {
    // Get or create preferences
    let preferences = await getGuestPreferences(guestId);

    return prisma.guestPreference.update({
        where: { guestId },
        data: {
            ...data,
            updatedAt: new Date(),
        },
    });
}

/**
 * Get complete guest history
 */
export async function getGuestHistory(guestId: string) {
    const [guest, preferences, bookings, payments, feedback, notes] = await Promise.all([
        prisma.guest.findUnique({
            where: { id: guestId },
        }),
        getGuestPreferences(guestId),
        prisma.booking.findMany({
            where: { guestId },
            orderBy: { checkIn: 'desc' },
            include: {
                room: true,
                addons: true,
            },
        }),
        prisma.payment.findMany({
            where: { booking: { guestId } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.feedback.findMany({
            where: { guestId },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.guestNote.findMany({
            where: { guestId },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    // Calculate spending summary
    const totalSpending = bookings.reduce(
        (sum, b) => sum + Number(b.totalAmount),
        0
    );
    const totalBookings = bookings.length;
    const totalNights = bookings.reduce((sum, b) => {
        const nights = Math.ceil(
            (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + nights;
    }, 0);

    return {
        guest,
        preferences,
        stats: {
            totalBookings,
            totalNights,
            totalSpending,
            avgBookingValue: totalBookings > 0 ? totalSpending / totalBookings : 0,
        },
        recentBookings: bookings.slice(0, 10),
        recentPayments: payments.slice(0, 10),
        recentFeedback: feedback.slice(0, 5),
        recentNotes: notes.slice(0, 10),
    };
}

/**
 * Get guest stay history
 */
export async function getGuestStayHistory(guestId: string, limit: number = 20) {
    return prisma.booking.findMany({
        where: { guestId },
        orderBy: { checkIn: 'desc' },
        take: limit,
        include: {
            room: true,
            addons: true,
            feedback: true,
        },
    });
}

/**
 * Get guest spending history
 */
export async function getGuestSpendingHistory(guestId: string, limit: number = 20) {
    const bookings = await prisma.booking.findMany({
        where: { guestId },
        orderBy: { checkIn: 'desc' },
        take: limit,
        include: {
            room: true,
            payments: true,
        },
    });

    return bookings.map(booking => ({
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        roomNumber: booking.room.roomNumber,
        roomType: booking.room.type,
        totalAmount: Number(booking.totalAmount),
        discountAmount: Number(booking.discountAmount),
        netAmount: Number(booking.totalAmount) - Number(booking.discountAmount),
        paymentStatus: booking.paymentStatus,
        payments: booking.payments.map(p => ({
            amount: Number(p.amount),
            method: p.method,
            status: p.status,
            date: p.createdAt,
        })),
    }));
}

/**
 * Get guest feedback history
 */
export async function getGuestFeedbackHistory(guestId: string) {
    return prisma.feedback.findMany({
        where: { guestId },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Get guest payment history
 */
export async function getGuestPaymentHistory(guestId: string, limit: number = 50) {
    return prisma.payment.findMany({
        where: { booking: { guestId } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            booking: {
                select: {
                    bookingNumber: true,
                    checkIn: true,
                    checkOut: true,
                },
            },
        },
    });
}

/**
 * Add an internal note to a guest
 */
export async function addGuestNote(guestId: string, note: string, staffId: string) {
    return prisma.guestNote.create({
        data: {
            guestId,
            note,
            createdById: staffId,
        },
        include: {
            createdBy: {
                select: {
                    name: true,
                    role: true,
                },
            },
        },
    });
}

/**
 * Get guest notes
 */
export async function getGuestNotes(guestId: string) {
    return prisma.guestNote.findMany({
        where: { guestId },
        orderBy: { createdAt: 'desc' },
        include: {
            createdBy: {
                select: {
                    name: true,
                    role: true,
                },
            },
        },
    });
}

/**
 * Get guest tags
 */
export async function getGuestTags(guestId: string): Promise<GuestTag[]> {
    const guest = await prisma.guest.findUnique({
        where: { id: guestId },
        select: { tags: true },
    });

    return (guest?.tags as GuestTag[]) || [];
}

/**
 * Add a tag to a guest
 */
export async function tagGuest(guestId: string, tag: GuestTag) {
    const currentTags = await getGuestTags(guestId);

    if (currentTags.includes(tag)) {
        return currentTags;
    }

    const updatedTags = [...currentTags, tag];

    await prisma.guest.update({
        where: { id: guestId },
        data: { tags: updatedTags as unknown as Prisma.InputJsonValue },
    });

    return updatedTags;
}

/**
 * Remove a tag from a guest
 */
export async function untagGuest(guestId: string, tag: GuestTag) {
    const currentTags = await getGuestTags(guestId);

    const updatedTags = currentTags.filter(t => t !== tag);

    await prisma.guest.update({
        where: { id: guestId },
        data: { tags: updatedTags as unknown as Prisma.InputJsonValue },
    });

    return updatedTags;
}

/**
 * Get guest stay statistics
 */
export async function getGuestStayStats(guestId: string) {
    const bookings = await prisma.booking.findMany({
        where: { guestId },
        select: {
            checkIn: true,
            checkOut: true,
            totalAmount: true,
            status: true,
            room: {
                select: {
                    type: true,
                },
            },
        },
    });

    if (bookings.length === 0) {
        return {
            totalStays: 0,
            totalNights: 0,
            totalSpending: 0,
            avgNightsPerStay: 0,
            avgSpendingPerStay: 0,
            favoriteRoomType: null,
            lastStay: null,
            firstStay: null,
        };
    }

    const totalNights = bookings.reduce((sum, b) => {
        const nights = Math.ceil(
            (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + nights;
    }, 0);

    const totalSpending = bookings.reduce(
        (sum, b) => sum + Number(b.totalAmount),
        0
    );

    // Find favorite room type
    const roomTypeCounts: Record<string, number> = {};
    bookings.forEach(b => {
        const type = b.room.type;
        roomTypeCounts[type] = (roomTypeCounts[type] || 0) + 1;
    });
    const favoriteRoomType = Object.entries(roomTypeCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] as RoomType || null;

    return {
        totalStays: bookings.length,
        totalNights,
        totalSpending,
        avgNightsPerStay: totalNights / bookings.length,
        avgSpendingPerStay: totalSpending / bookings.length,
        favoriteRoomType,
        lastStay: bookings[0]?.checkIn || null,
        firstStay: bookings[bookings.length - 1]?.checkIn || null,
    };
}

/**
 * Search guests by various criteria
 */
export async function searchGuestsForHistory(
    criteria: {
        name?: string;
        email?: string;
        phone?: string;
        tags?: GuestTag[];
    }
) {
    const where: Record<string, unknown> = {};

    if (criteria.name) {
        where.name = { contains: criteria.name, mode: 'insensitive' };
    }
    if (criteria.email) {
        where.email = { contains: criteria.email, mode: 'insensitive' };
    }
    if (criteria.phone) {
        where.phone = { contains: criteria.phone };
    }
    if (criteria.tags && criteria.tags.length > 0) {
        where.tags = { hasSome: criteria.tags };
    }

    return prisma.guest.findMany({
        where,
        orderBy: { name: 'asc' },
        take: 50,
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            tags: true,
            createdAt: true,
        },
    });
}

/**
 * Get VIP guests
 */
export async function getVipGuests() {
    return prisma.guest.findMany({
        where: {
            tags: { has: 'VIP' },
        },
        orderBy: { name: 'asc' },
    });
}

/**
 * Get problem guests (for front desk awareness)
 */
export async function getProblemGuests() {
    return prisma.guest.findMany({
        where: {
            tags: { has: 'PROBLEM' },
        },
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            phone: true,
            tags: true,
        },
    });
}

/**
 * Get guest by booking ID
 */
export async function getGuestByBookingId(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { guestId: true },
    });

    if (!booking) {
        return null;
    }

    return prisma.guest.findUnique({
        where: { id: booking.guestId },
    });
}
