// packages/db/src/queries/packageDealQueries.ts
// Package deals (room + food + spa) - Scenario 77

import prisma from '../index';
import { Prisma, RoomType } from '@prisma/client';

export type PackageComponents = {
    room: boolean;
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    spa: boolean;
    airportTransfer: boolean;
};

/**
 * Create a new package deal
 */
export async function createPackageDeal(data: {
    propertyId?: string;
    name: string;
    description?: string;
    singleOccupancyRate: number;
    doubleOccupancyRate: number;
    validFrom?: Date;
    validUntil?: Date;
    minNights?: number;
    maxNights?: number;
    roomType?: RoomType;
    components: PackageComponents;
}) {
    return prisma.packageDeal.create({
        data: {
            propertyId: data.propertyId ?? 'default',
            name: data.name,
            description: data.description,
            singleOccupancyRate: new Prisma.Decimal(data.singleOccupancyRate),
            doubleOccupancyRate: new Prisma.Decimal(data.doubleOccupancyRate),
            validFrom: data.validFrom,
            validUntil: data.validUntil,
            minNights: data.minNights ?? 1,
            maxNights: data.maxNights,
            roomType: data.roomType,
            components: data.components as unknown as Prisma.InputJsonValue,
        },
    });
}

/**
 * Update a package deal
 */
export async function updatePackageDeal(
    dealId: string,
    data: Partial<{
        name: string;
        description: string;
        singleOccupancyRate: number;
        doubleOccupancyRate: number;
        validFrom: Date;
        validUntil: Date;
        minNights: number;
        maxNights: number;
        roomType: RoomType;
        components: PackageComponents;
        isActive: boolean;
    }>
) {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.singleOccupancyRate !== undefined) updateData.singleOccupancyRate = new Prisma.Decimal(data.singleOccupancyRate);
    if (data.doubleOccupancyRate !== undefined) updateData.doubleOccupancyRate = new Prisma.Decimal(data.doubleOccupancyRate);
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
    if (data.minNights !== undefined) updateData.minNights = data.minNights;
    if (data.maxNights !== undefined) updateData.maxNights = data.maxNights;
    if (data.roomType !== undefined) updateData.roomType = data.roomType;
    if (data.components !== undefined) updateData.components = data.components as unknown as Prisma.InputJsonValue;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return prisma.packageDeal.update({
        where: { id: dealId },
        data: updateData,
    });
}

/**
 * Get a package deal by ID
 */
export async function getPackageDeal(dealId: string) {
    return prisma.packageDeal.findUnique({
        where: { id: dealId },
    });
}

/**
 * Get active package deals for a property
 */
export async function getActivePackageDeals(propertyId?: string, date?: Date) {
    const checkDate = date ?? new Date();

    const where: Record<string, unknown> = {
        isActive: true,
        OR: [
            { validFrom: null },
            { validFrom: { lte: checkDate } },
        ],
        AND: [
            {
                OR: [
                    { validUntil: null },
                    { validUntil: { gte: checkDate } },
                ],
            },
        ],
    };

    if (propertyId) {
        where.propertyId = propertyId;
    }

    return prisma.packageDeal.findMany({
        where,
        orderBy: { name: 'asc' },
    });
}

/**
 * Apply a package deal to a booking
 */
export async function applyPackageToBooking(bookingId: string, packageDealId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { room: true, guest: true },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    const packageDeal = await getPackageDeal(packageDealId);

    if (!packageDeal) {
        throw new Error('Package deal not found');
    }

    if (!packageDeal.isActive) {
        throw new Error('Package deal is not active');
    }

    // Check validity dates
    const now = new Date();
    if (packageDeal.validFrom && packageDeal.validFrom > now) {
        throw new Error('Package deal is not yet valid');
    }
    if (packageDeal.validUntil && packageDeal.validUntil < now) {
        throw new Error('Package deal has expired');
    }

    // Calculate nights
    const nights = Math.ceil(
        (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check min/max nights
    if (nights < packageDeal.minNights) {
        throw new Error(`Package requires a minimum of ${packageDeal.minNights} night(s)`);
    }
    if (packageDeal.maxNights && nights > packageDeal.maxNights) {
        throw new Error(`Package is valid for stays up to ${packageDeal.maxNights} night(s)`);
    }

    // Calculate package price
    const price = await calculatePackagePrice(
        packageDealId,
        nights,
        booking.guestsCount
    );

    return { booking, packageDeal, price };
}

/**
 * Calculate package price
 */
export async function calculatePackagePrice(
    packageDealId: string,
    nights: number,
    occupancy: number
): Promise<{
    basePrice: number;
    roomRate: number;
    addonValue: number;
    totalPrice: number;
    breakdown: {
        room: number;
        breakfast?: number;
        lunch?: number;
        dinner?: number;
        spa?: number;
        airportTransfer?: number;
    };
}> {
    const packageDeal = await getPackageDeal(packageDealId);

    if (!packageDeal) {
        throw new Error('Package deal not found');
    }

    const components = packageDeal.components as unknown as PackageComponents;
    const isSingle = occupancy <= 1;
    const baseRate = isSingle
        ? Number(packageDeal.singleOccupancyRate)
        : Number(packageDeal.doubleOccupancyRate);

    const roomRate = baseRate * nights;

    // Calculate addon values (these would typically come from addon definitions)
    const addonValues = {
        breakfast: components.breakfast ? 500 * nights : 0, // ₹500 per day
        lunch: components.lunch ? 800 * nights : 0,
        dinner: components.dinner ? 800 * nights : 0,
        spa: components.spa ? 1500 * nights : 0,
        airportTransfer: components.airportTransfer ? 1000 : 0,
    };

    const addonValue = Object.values(addonValues).reduce((sum, val) => sum + val, 0);
    const totalPrice = roomRate + addonValue;

    return {
        basePrice: isSingle ? Number(packageDeal.singleOccupancyRate) : Number(packageDeal.doubleOccupancyRate),
        roomRate,
        addonValue,
        totalPrice,
        breakdown: {
            room: roomRate,
            ...(components.breakfast && { breakfast: addonValues.breakfast }),
            ...(components.lunch && { lunch: addonValues.lunch }),
            ...(components.dinner && { dinner: addonValues.dinner }),
            ...(components.spa && { spa: addonValues.spa }),
            ...(components.airportTransfer && { airportTransfer: addonValues.airportTransfer }),
        },
    };
}

/**
 * Deactivate a package deal
 */
export async function deactivatePackageDeal(dealId: string) {
    return prisma.packageDeal.update({
        where: { id: dealId },
        data: { isActive: false },
    });
}

/**
 * Get all package deals
 */
export async function getAllPackageDeals(propertyId?: string) {
    const where: Record<string, unknown> = {};

    if (propertyId) {
        where.propertyId = propertyId;
    }

    return prisma.packageDeal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Get package deal by booking ID (Booking model has no packageDealId field)
 */
export async function getPackageDealByBooking(_bookingId: string) {
    return null;
}
