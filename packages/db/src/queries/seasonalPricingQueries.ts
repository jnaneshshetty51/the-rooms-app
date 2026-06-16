import prisma from '../index';
import { Decimal } from '@prisma/client/runtime/library';
import { RoomType, SeasonType, AdjustmentType } from '@prisma/client';

/**
 * ─── Seasonal Pricing Queries (Scenario 48) ───────────────────────────────
 *
 * Functions for seasonal pricing management:
 * - Create/update seasonal rates
 * - Get applicable seasonal rates
 * - Calculate seasonal price adjustments
 */

// ─── Create Seasonal Rate ─────────────────────────────────────────────────

export type CreateSeasonalRateParams = {
    propertyId: string;
    name: string;
    seasonType: SeasonType;
    startDate: Date;
    endDate: Date;
    adjustmentType: AdjustmentType;
    adjustmentValue: number;
    roomTypes?: RoomType[];
    minNights?: number;
    isActive?: boolean;
    createdById?: string;
};

export type CreateSeasonalRateResult = {
    seasonalRate: {
        id: string;
        name: string;
        seasonType: string;
        startDate: Date;
        endDate: Date;
        adjustmentType: string;
        adjustmentValue: number;
        isActive: boolean;
    };
};

/**
 * Create a new seasonal rate
 */
export async function createSeasonalRate(params: CreateSeasonalRateParams) {
    const {
        propertyId,
        name,
        seasonType,
        startDate,
        endDate,
        adjustmentType,
        adjustmentValue,
        roomTypes = [],
        minNights = 1,
        isActive = true,
        createdById,
    } = params;

    const seasonalRate = await prisma.seasonalRate.create({
        data: {
            propertyId,
            name,
            seasonType,
            startDate,
            endDate,
            adjustmentType,
            adjustmentValue: new Decimal(adjustmentValue),
            roomTypes,
            minNights,
            isActive,
        },
    });

    // Audit log
    if (createdById) {
        await prisma.auditLog.create({
            data: {
                userId: createdById,
                action: 'CREATE',
                entity: 'seasonal_rate',
                entityId: seasonalRate.id,
                metadata: {
                    name,
                    seasonType,
                    adjustmentType,
                    adjustmentValue,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                },
            },
        });
    }

    return {
        seasonalRate: {
            id: seasonalRate.id,
            name: seasonalRate.name,
            seasonType: seasonalRate.seasonType,
            startDate: seasonalRate.startDate,
            endDate: seasonalRate.endDate,
            adjustmentType: seasonalRate.adjustmentType,
            adjustmentValue: seasonalRate.adjustmentValue.toNumber(),
            isActive: seasonalRate.isActive,
        },
    };
}

// ─── Update Seasonal Rate ────────────────────────────────────────────────

export type UpdateSeasonalRateParams = {
    id: string;
    name?: string;
    seasonType?: SeasonType;
    startDate?: Date;
    endDate?: Date;
    adjustmentType?: AdjustmentType;
    adjustmentValue?: number;
    roomTypes?: RoomType[];
    minNights?: number;
    isActive?: boolean;
    updatedById?: string;
};

export type UpdateSeasonalRateResult = {
    seasonalRate: {
        id: string;
        name: string;
        seasonType: string;
        startDate: Date;
        endDate: Date;
        adjustmentType: string;
        adjustmentValue: number;
        isActive: boolean;
    };
};

/**
 * Update an existing seasonal rate
 */
export async function updateSeasonalRate(params: UpdateSeasonalRateParams) {
    const {
        id,
        name,
        seasonType,
        startDate,
        endDate,
        adjustmentType,
        adjustmentValue,
        roomTypes,
        minNights,
        isActive,
        updatedById,
    } = params;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (seasonType !== undefined) updateData.seasonType = seasonType;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (adjustmentType !== undefined) updateData.adjustmentType = adjustmentType;
    if (adjustmentValue !== undefined) updateData.adjustmentValue = new Decimal(adjustmentValue);
    if (roomTypes !== undefined) updateData.roomTypes = roomTypes;
    if (minNights !== undefined) updateData.minNights = minNights;
    if (isActive !== undefined) updateData.isActive = isActive;

    const seasonalRate = await prisma.seasonalRate.update({
        where: { id },
        data: updateData,
    });

    // Audit log
    if (updatedById) {
        await prisma.auditLog.create({
            data: {
                userId: updatedById,
                action: 'UPDATE',
                entity: 'seasonal_rate',
                entityId: id,
                metadata: updateData,
            },
        });
    }

    return {
        seasonalRate: {
            id: seasonalRate.id,
            name: seasonalRate.name,
            seasonType: seasonalRate.seasonType,
            startDate: seasonalRate.startDate,
            endDate: seasonalRate.endDate,
            adjustmentType: seasonalRate.adjustmentType,
            adjustmentValue: seasonalRate.adjustmentValue.toNumber(),
            isActive: seasonalRate.isActive,
        },
    };
}

// ─── Get Seasonal Rates ───────────────────────────────────────────────────

export type GetSeasonalRatesParams = {
    propertyId: string;
    roomType?: RoomType;
    date?: Date;
    activeOnly?: boolean;
};

export type GetSeasonalRatesResult = {
    seasonalRates: Array<{
        id: string;
        name: string;
        seasonType: string;
        startDate: Date;
        endDate: Date;
        adjustmentType: string;
        adjustmentValue: number;
        minNights: number;
        isActive: boolean;
        roomTypes: string[];
    }>;
};

/**
 * Get seasonal rates for a property, optionally filtered by date and room type
 */
export async function getSeasonalRates(params: GetSeasonalRatesParams) {
    const { propertyId, roomType, date, activeOnly = true } = params;

    const where: any = { propertyId };

    if (activeOnly) {
        where.isActive = true;
    }

    if (date) {
        where.startDate = { lte: date };
        where.endDate = { gte: date };
    }

    const seasonalRates = await prisma.seasonalRate.findMany({
        where,
        orderBy: [
            { startDate: 'asc' },
            { priority: 'desc' },
        ],
    });

    // Filter by room type if specified
    const filtered = roomType
        ? seasonalRates.filter(sr => sr.roomTypes.length === 0 || sr.roomTypes.includes(roomType))
        : seasonalRates;

    return {
        seasonalRates: filtered.map(sr => ({
            id: sr.id,
            name: sr.name,
            seasonType: sr.seasonType,
            startDate: sr.startDate,
            endDate: sr.endDate,
            adjustmentType: sr.adjustmentType,
            adjustmentValue: sr.adjustmentValue.toNumber(),
            minNights: sr.minNights,
            isActive: sr.isActive,
            roomTypes: sr.roomTypes,
        })),
    };
}

// ─── Calculate Seasonal Price ────────────────────────────────────────────

export type CalculateSeasonalPriceParams = {
    basePrice: number;
    date: Date;
    roomType: RoomType;
    nights?: number;
    propertyId?: string;
};

export type CalculateSeasonalPriceResult = {
    basePrice: number;
    adjustedPrice: number;
    adjustment: number;
    adjustmentType: string | null;
    seasonType: string | null;
    seasonName: string | null;
    appliedRateId: string | null;
};

/**
 * Calculate seasonal price for a given date and room type
 * Returns the adjusted price based on applicable seasonal rates
 */
export async function calculateSeasonalPrice(params: CalculateSeasonalPriceParams): Promise<CalculateSeasonalPriceResult> {
    const { basePrice, date, roomType, nights = 1, propertyId = 'default' } = params;

    // Find applicable seasonal rate
    const seasonalRates = await getSeasonalRates({
        propertyId,
        roomType,
        date,
        activeOnly: true,
    });

    if (seasonalRates.seasonalRates.length === 0) {
        return {
            basePrice,
            adjustedPrice: basePrice,
            adjustment: 0,
            adjustmentType: null,
            seasonType: null,
            seasonName: null,
            appliedRateId: null,
        };
    }

    // Use the first matching rate (highest priority)
    const applicableRate = seasonalRates.seasonalRates[0];

    let adjustedPrice = basePrice;
    let adjustment = 0;

    if (applicableRate.adjustmentType === 'PERCENTAGE') {
        adjustment = (basePrice * applicableRate.adjustmentValue) / 100;
        adjustedPrice = basePrice + adjustment;
    } else {
        // FIXED adjustment
        adjustment = applicableRate.adjustmentValue;
        adjustedPrice = basePrice + adjustment;
    }

    return {
        basePrice,
        adjustedPrice: Math.round(adjustedPrice * 100) / 100,
        adjustment: Math.round(adjustment * 100) / 100,
        adjustmentType: applicableRate.adjustmentType,
        seasonType: applicableRate.seasonType,
        seasonName: applicableRate.name,
        appliedRateId: applicableRate.id,
    };
}

// ─── Delete Seasonal Rate ──────────────────────────────────────────────────

export type DeleteSeasonalRateParams = {
    id: string;
    deletedById?: string;
};

/**
 * Delete (deactivate) a seasonal rate
 */
export async function deleteSeasonalRate(params: DeleteSeasonalRateParams) {
    const { id, deletedById } = params;

    // Soft delete by setting isActive to false
    const seasonalRate = await prisma.seasonalRate.update({
        where: { id },
        data: { isActive: false },
    });

    // Audit log
    if (deletedById) {
        await prisma.auditLog.create({
            data: {
                userId: deletedById,
                action: 'DELETE',
                entity: 'seasonal_rate',
                entityId: id,
                metadata: { name: seasonalRate.name },
            },
        });
    }

    return { success: true, id };
}

// ─── Get Seasonal Rate Calendar ─────────────────────────────────────────

export type GetSeasonalRateCalendarParams = {
    propertyId: string;
    startDate: Date;
    endDate: Date;
    roomType?: RoomType;
};

export type SeasonalRateCalendarEntry = {
    date: Date;
    seasonType: SeasonType | null;
    seasonName: string | null;
    rateId: string | null;
    basePrice: number;
    adjustedPrice: number;
    adjustment: number;
    adjustmentType: string | null;
};

export type GetSeasonalRateCalendarResult = {
    startDate: Date;
    endDate: Date;
    entries: SeasonalRateCalendarEntry[];
};

/**
 * Get a calendar view of seasonal rates for a date range
 */
export async function getSeasonalRateCalendar(params: GetSeasonalRateCalendarParams) {
    const { propertyId, startDate, endDate, roomType } = params;

    const entries: SeasonalRateCalendarEntry[] = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];

        // Find applicable rate for this date
        const seasonalRates = await getSeasonalRates({
            propertyId,
            roomType,
            date: currentDate,
            activeOnly: true,
        });

        if (seasonalRates.seasonalRates.length > 0) {
            const rate = seasonalRates.seasonalRates[0];
            entries.push({
                date: new Date(currentDate),
                seasonType: rate.seasonType as SeasonType,
                seasonName: rate.name,
                rateId: rate.id,
                basePrice: 0, // Will be filled by caller
                adjustedPrice: 0,
                adjustment: rate.adjustmentValue,
                adjustmentType: rate.adjustmentType,
            });
        } else {
            entries.push({
                date: new Date(currentDate),
                seasonType: null,
                seasonName: null,
                rateId: null,
                basePrice: 0,
                adjustedPrice: 0,
                adjustment: 0,
                adjustmentType: null,
            });
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
        startDate,
        endDate,
        entries,
    };
}
