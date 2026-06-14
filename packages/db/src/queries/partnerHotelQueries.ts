import prisma from '../index';
import { RoomType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * ─── Partner Hotel Queries ────────────────────────────────────────────────────
 *
 * Functions for managing partner hotels for overbooking relocation
 */

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Create a partner hotel
 */
export async function createPartnerHotel(data: {
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    roomTypes?: RoomType[];
    negotiatedRate?: Decimal | number;
    guestPays?: Decimal | number;
    distanceKm?: Decimal | number;
    notes?: string;
}) {
    const {
        name,
        address,
        city,
        phone,
        email,
        roomTypes = [],
        negotiatedRate,
        guestPays,
        distanceKm,
        notes,
    } = data;

    return prisma.partnerHotel.create({
        data: {
            name,
            address,
            city,
            phone,
            email,
            roomTypes,
            negotiatedRate: negotiatedRate ? new Decimal(negotiatedRate.toString()) : undefined,
            guestPays: guestPays ? new Decimal(guestPays.toString()) : undefined,
            distanceKm: distanceKm ? new Decimal(distanceKm.toString()) : undefined,
            notes,
        },
    });
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Get partner hotel by ID
 */
export async function getPartnerHotelById(id: string) {
    return prisma.partnerHotel.findUnique({
        where: { id },
    });
}

/**
 * Get all active partner hotels
 */
export async function getActivePartnerHotels(options: {
    city?: string;
    roomType?: RoomType;
} = {}) {
    const { city, roomType } = options;

    const where: any = { isActive: true };
    if (city) where.city = city;
    if (roomType) where.roomTypes = { has: roomType };

    return prisma.partnerHotel.findMany({
        where,
        orderBy: { distanceKm: 'asc' },
    });
}

/**
 * Search partner hotels
 */
export async function searchPartnerHotels(query: string) {
    return prisma.partnerHotel.findMany({
        where: {
            isActive: true,
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { city: { contains: query, mode: 'insensitive' } },
                { address: { contains: query, mode: 'insensitive' } },
            ],
        },
        orderBy: { distanceKm: 'asc' },
        take: 20,
    });
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update partner hotel
 */
export async function updatePartnerHotel(
    id: string,
    data: {
        name?: string;
        address?: string;
        city?: string;
        phone?: string;
        email?: string;
        roomTypes?: RoomType[];
        negotiatedRate?: Decimal | number;
        guestPays?: Decimal | number;
        distanceKm?: Decimal | number;
        notes?: string;
        isActive?: boolean;
    }
) {
    const updateData: any = { ...data };
    if (data.negotiatedRate) {
        updateData.negotiatedRate = new Decimal(data.negotiatedRate.toString());
    }
    if (data.guestPays) {
        updateData.guestPays = new Decimal(data.guestPays.toString());
    }
    if (data.distanceKm) {
        updateData.distanceKm = new Decimal(data.distanceKm.toString());
    }

    return prisma.partnerHotel.update({
        where: { id },
        data: updateData,
    });
}

/**
 * Deactivate partner hotel
 */
export async function deactivatePartnerHotel(id: string) {
    return prisma.partnerHotel.update({
        where: { id },
        data: { isActive: false },
    });
}

// ─── Overbooking Policy ───────────────────────────────────────────────────────

/**
 * Get overbooking policy for property
 */
export async function getOverbookingPolicy(propertyId: string = 'default') {
    return prisma.overbookingPolicy.findUnique({
        where: { propertyId },
        include: { partnerHotel: true },
    });
}

/**
 * Create or update overbooking policy
 */
export async function upsertOverbookingPolicy(
    propertyId: string,
    data: {
        isEnabled?: boolean;
        studioOverbookLimit?: number;
        premiumOverbookLimit?: number;
        enableWaitlist?: boolean;
        waitlistTimeout?: number;
        resolutionOrder?: string[];
        partnerHotelId?: string;
        partnerHotelName?: string;
        partnerHotelContact?: string;
        partnerHotelRate?: Decimal | number;
    }
) {
    const {
        isEnabled = false,
        studioOverbookLimit = 0,
        premiumOverbookLimit = 0,
        enableWaitlist = true,
        waitlistTimeout = 60,
        resolutionOrder = [],
        partnerHotelId,
        partnerHotelName,
        partnerHotelContact,
        partnerHotelRate,
    } = data;

    return prisma.overbookingPolicy.upsert({
        where: { propertyId },
        create: {
            propertyId,
            isEnabled,
            studioOverbookLimit,
            premiumOverbookLimit,
            enableWaitlist,
            waitlistTimeout,
            resolutionOrder: resolutionOrder as any,
            partnerHotelId,
            partnerHotelName,
            partnerHotelContact,
            partnerHotelRate: partnerHotelRate ? new Decimal(partnerHotelRate.toString()) : undefined,
        },
        update: {
            isEnabled,
            studioOverbookLimit,
            premiumOverbookLimit,
            enableWaitlist,
            waitlistTimeout,
            resolutionOrder: resolutionOrder as any,
            partnerHotelId,
            partnerHotelName,
            partnerHotelContact,
            partnerHotelRate: partnerHotelRate ? new Decimal(partnerHotelRate.toString()) : undefined,
        },
    });
}

/**
 * Check if overbooking is allowed for a room type
 */
export async function canOverbook(
    propertyId: string = 'default',
    roomType: RoomType
): Promise<{ allowed: boolean; limit: number; current: number }> {
    const policy = await prisma.overbookingPolicy.findUnique({
        where: { propertyId },
    });

    if (!policy || !policy.isEnabled) {
        return { allowed: false, limit: 0, current: 0 };
    }

    const limit = roomType === 'STUDIO' ? policy.studioOverbookLimit : policy.premiumOverbookLimit;

    // Count current overbooked bookings for this room type
    const overbookedCount = await prisma.booking.count({
        where: {
            propertyId,
            room: { type: roomType },
            isOverbooking: true,
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
    });

    return {
        allowed: overbookedCount < limit,
        limit,
        current: overbookedCount,
    };
}
