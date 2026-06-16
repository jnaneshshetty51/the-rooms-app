import prisma from '../index';
import { Decimal } from '@prisma/client/runtime/library';
import { RoomType, AdjustmentType } from '@prisma/client';

/**
 * ─── Dynamic Pricing Queries (Scenario 49) ─────────────────────────────
 *
 * Functions for dynamic pricing management:
 * - Create/update dynamic pricing rules
 * - Get active rules for a date
 * - Calculate dynamic price adjustments
 */

// ─── Dynamic Pricing Conditions ──────────────────────────────────────────

export type DynamicPricingCondition = {
    dayOfWeek?: number[]; // 0 = Sunday, 6 = Saturday
    minOccupancy?: number; // Minimum occupancy percentage (0-100)
    maxOccupancy?: number; // Maximum occupancy percentage (0-100)
    bookingSource?: string[];
    minNights?: number;
    maxNights?: number;
    advanceBookingDays?: number; // Days in advance booking is made
    isWeekend?: boolean;
    isHoliday?: boolean;
};

// ─── Create Dynamic Pricing Rule ────────────────────────────────────────

export type CreateDynamicPricingRuleParams = {
    propertyId: string;
    name: string;
    description?: string;
    conditions: DynamicPricingCondition;
    adjustmentType: AdjustmentType;
    adjustmentValue: number;
    priority?: number;
    roomTypes?: RoomType[];
    validFrom?: Date;
    validUntil?: Date;
    isActive?: boolean;
    createdById?: string;
};

export type CreateDynamicPricingRuleResult = {
    rule: {
        id: string;
        name: string;
        description: string | null;
        conditions: DynamicPricingCondition;
        adjustmentType: string;
        adjustmentValue: number;
        priority: number;
        isActive: boolean;
    };
};

/**
 * Create a new dynamic pricing rule
 */
export async function createDynamicPricingRule(params: CreateDynamicPricingRuleParams) {
    const {
        propertyId,
        name,
        description,
        conditions,
        adjustmentType,
        adjustmentValue,
        priority = 0,
        roomTypes = [],
        validFrom,
        validUntil,
        isActive = true,
        createdById,
    } = params;

    const rule = await prisma.dynamicPricingRule.create({
        data: {
            propertyId,
            name,
            description,
            conditions: conditions as any,
            adjustmentType,
            adjustmentValue: new Decimal(adjustmentValue),
            priority,
            roomTypes,
            validFrom,
            validUntil,
            isActive,
        },
    });

    // Audit log
    if (createdById) {
        await prisma.auditLog.create({
            data: {
                userId: createdById,
                action: 'CREATE',
                entity: 'dynamic_pricing_rule',
                entityId: rule.id,
                metadata: {
                    name,
                    conditions,
                    adjustmentType,
                    adjustmentValue,
                    priority,
                },
            },
        });
    }

    return {
        rule: {
            id: rule.id,
            name: rule.name,
            description: rule.description,
            conditions: rule.conditions as DynamicPricingCondition,
            adjustmentType: rule.adjustmentType,
            adjustmentValue: rule.adjustmentValue.toNumber(),
            priority: rule.priority,
            isActive: rule.isActive,
        },
    };
}

// ─── Update Dynamic Pricing Rule ────────────────────────────────────────

export type UpdateDynamicPricingRuleParams = {
    id: string;
    name?: string;
    description?: string;
    conditions?: DynamicPricingCondition;
    adjustmentType?: AdjustmentType;
    adjustmentValue?: number;
    priority?: number;
    roomTypes?: RoomType[];
    validFrom?: Date;
    validUntil?: Date;
    isActive?: boolean;
    updatedById?: string;
};

export type UpdateDynamicPricingRuleResult = {
    rule: {
        id: string;
        name: string;
        description: string | null;
        conditions: DynamicPricingCondition;
        adjustmentType: string;
        adjustmentValue: number;
        priority: number;
        isActive: boolean;
    };
};

/**
 * Update an existing dynamic pricing rule
 */
export async function updateDynamicPricingRule(params: UpdateDynamicPricingRuleParams) {
    const {
        id,
        name,
        description,
        conditions,
        adjustmentType,
        adjustmentValue,
        priority,
        roomTypes,
        validFrom,
        validUntil,
        isActive,
        updatedById,
    } = params;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (conditions !== undefined) updateData.conditions = conditions as any;
    if (adjustmentType !== undefined) updateData.adjustmentType = adjustmentType;
    if (adjustmentValue !== undefined) updateData.adjustmentValue = new Decimal(adjustmentValue);
    if (priority !== undefined) updateData.priority = priority;
    if (roomTypes !== undefined) updateData.roomTypes = roomTypes;
    if (validFrom !== undefined) updateData.validFrom = validFrom;
    if (validUntil !== undefined) updateData.validUntil = validUntil;
    if (isActive !== undefined) updateData.isActive = isActive;

    const rule = await prisma.dynamicPricingRule.update({
        where: { id },
        data: updateData,
    });

    // Audit log
    if (updatedById) {
        await prisma.auditLog.create({
            data: {
                userId: updatedById,
                action: 'UPDATE',
                entity: 'dynamic_pricing_rule',
                entityId: id,
                metadata: updateData,
            },
        });
    }

    return {
        rule: {
            id: rule.id,
            name: rule.name,
            description: rule.description,
            conditions: rule.conditions as DynamicPricingCondition,
            adjustmentType: rule.adjustmentType,
            adjustmentValue: rule.adjustmentValue.toNumber(),
            priority: rule.priority,
            isActive: rule.isActive,
        },
    };
}

// ─── Get Active Dynamic Pricing Rules ───────────────────────────────────

export type GetActiveDynamicPricingRulesParams = {
    propertyId: string;
    roomType?: RoomType;
    date: Date;
};

export type GetActiveDynamicPricingRulesResult = {
    rules: Array<{
        id: string;
        name: string;
        conditions: DynamicPricingCondition;
        adjustmentType: string;
        adjustmentValue: number;
        priority: number;
    }>;
};

/**
 * Get active dynamic pricing rules for a property, date, and room type
 * Rules are sorted by priority (highest first)
 */
export async function getActiveDynamicPricingRules(params: GetActiveDynamicPricingRulesParams) {
    const { propertyId, roomType, date } = params;

    const where: any = {
        propertyId,
        isActive: true,
        OR: [
            { validFrom: null },
            { validFrom: { lte: date } },
        ],
        AND: [
            {
                OR: [
                    { validUntil: null },
                    { validUntil: { gte: date } },
                ],
            },
        ],
    };

    const rules = await prisma.dynamicPricingRule.findMany({
        where,
        orderBy: { priority: 'desc' },
    });

    // Filter by room type if specified
    const filtered = roomType
        ? rules.filter(r => r.roomTypes.length === 0 || r.roomTypes.includes(roomType))
        : rules;

    return {
        rules: filtered.map(r => ({
            id: r.id,
            name: r.name,
            conditions: r.conditions as DynamicPricingCondition,
            adjustmentType: r.adjustmentType,
            adjustmentValue: r.adjustmentValue.toNumber(),
            priority: r.priority,
        })),
    };
}

// ─── Calculate Dynamic Price ──────────────────────────────────────────────

export type CalculateDynamicPriceParams = {
    basePrice: number;
    date: Date;
    roomType: RoomType;
    propertyId?: string;
    bookingSource?: string;
    nights?: number;
    advanceBookingDays?: number;
    currentOccupancy?: number; // Current occupancy percentage
};

export type CalculateDynamicPriceResult = {
    basePrice: number;
    adjustedPrice: number;
    totalAdjustment: number;
    adjustments: Array<{
        ruleId: string;
        ruleName: string;
        adjustmentType: string;
        adjustmentValue: number;
        adjustment: number;
    }>;
};

/**
 * Calculate dynamic price for a given date and room type
 * Applies all matching rules in priority order
 */
export async function calculateDynamicPrice(params: CalculateDynamicPriceParams): Promise<CalculateDynamicPriceResult> {
    const {
        basePrice,
        date,
        roomType,
        propertyId = 'default',
        bookingSource,
        nights = 1,
        advanceBookingDays = 0,
        currentOccupancy,
    } = params;

    // Get active rules
    const activeRules = await getActiveDynamicPricingRules({
        propertyId,
        roomType,
        date,
    });

    if (activeRules.rules.length === 0) {
        return {
            basePrice,
            adjustedPrice: basePrice,
            totalAdjustment: 0,
            adjustments: [],
        };
    }

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const adjustments = [];
    let currentPrice = basePrice;

    for (const rule of activeRules.rules) {
        if (evaluateConditions(rule.conditions, {
            dayOfWeek,
            isWeekend,
            bookingSource,
            nights,
            advanceBookingDays,
            currentOccupancy,
        })) {
            let adjustment = 0;

            if (rule.adjustmentType === 'PERCENTAGE') {
                adjustment = (currentPrice * rule.adjustmentValue) / 100;
            } else {
                // FIXED
                adjustment = rule.adjustmentValue;
            }

            currentPrice += adjustment;

            adjustments.push({
                ruleId: rule.id,
                ruleName: rule.name,
                adjustmentType: rule.adjustmentType,
                adjustmentValue: rule.adjustmentValue,
                adjustment: Math.round(adjustment * 100) / 100,
            });
        }
    }

    return {
        basePrice,
        adjustedPrice: Math.round(currentPrice * 100) / 100,
        totalAdjustment: Math.round((currentPrice - basePrice) * 100) / 100,
        adjustments,
    };
}

/**
 * Evaluate if conditions match for a given context
 */
function evaluateConditions(
    conditions: DynamicPricingCondition,
    context: {
        dayOfWeek: number;
        isWeekend: boolean;
        bookingSource?: string;
        nights?: number;
        advanceBookingDays?: number;
        currentOccupancy?: number;
    }
): boolean {
    // Day of week check
    if (conditions.dayOfWeek && conditions.dayOfWeek.length > 0) {
        if (!conditions.dayOfWeek.includes(context.dayOfWeek)) {
            return false;
        }
    }

    // Weekend check
    if (conditions.isWeekend !== undefined) {
        if (conditions.isWeekend !== context.isWeekend) {
            return false;
        }
    }

    // Occupancy check
    if (conditions.minOccupancy !== undefined && context.currentOccupancy !== undefined) {
        if (context.currentOccupancy < conditions.minOccupancy) {
            return false;
        }
    }

    if (conditions.maxOccupancy !== undefined && context.currentOccupancy !== undefined) {
        if (context.currentOccupancy > conditions.maxOccupancy) {
            return false;
        }
    }

    // Booking source check
    if (conditions.bookingSource && conditions.bookingSource.length > 0 && context.bookingSource) {
        if (!conditions.bookingSource.includes(context.bookingSource)) {
            return false;
        }
    }

    // Nights check
    if (conditions.minNights !== undefined && context.nights !== undefined) {
        if (context.nights < conditions.minNights) {
            return false;
        }
    }

    if (conditions.maxNights !== undefined && context.nights !== undefined) {
        if (context.nights > conditions.maxNights) {
            return false;
        }
    }

    // Advance booking days check
    if (conditions.advanceBookingDays !== undefined) {
        if (context.advanceBookingDays !== undefined && context.advanceBookingDays < conditions.advanceBookingDays) {
            return false;
        }
    }

    return true;
}

// ─── Delete Dynamic Pricing Rule ─────────────────────────────────────────

export type DeleteDynamicPricingRuleParams = {
    id: string;
    deletedById?: string;
};

/**
 * Delete (deactivate) a dynamic pricing rule
 */
export async function deleteDynamicPricingRule(params: DeleteDynamicPricingRuleParams) {
    const { id, deletedById } = params;

    const rule = await prisma.dynamicPricingRule.update({
        where: { id },
        data: { isActive: false },
    });

    // Audit log
    if (deletedById) {
        await prisma.auditLog.create({
            data: {
                userId: deletedById,
                action: 'DELETE',
                entity: 'dynamic_pricing_rule',
                entityId: id,
                metadata: { name: rule.name },
            },
        });
    }

    return { success: true, id };
}

// ─── Get All Dynamic Pricing Rules ───────────────────────────────────────

export type GetAllDynamicPricingRulesParams = {
    propertyId: string;
    activeOnly?: boolean;
    page?: number;
    perPage?: number;
};

export type GetAllDynamicPricingRulesResult = {
    rules: Array<{
        id: string;
        name: string;
        description: string | null;
        conditions: DynamicPricingCondition;
        adjustmentType: string;
        adjustmentValue: number;
        priority: number;
        validFrom: Date | null;
        validUntil: Date | null;
        isActive: boolean;
        roomTypes: string[];
        createdAt: Date;
    }>;
    total: number;
    pages: number;
    page: number;
};

/**
 * Get all dynamic pricing rules for a property
 */
export async function getAllDynamicPricingRules(params: GetAllDynamicPricingRulesParams) {
    const { propertyId, activeOnly = false, page = 1, perPage = 20 } = params;

    const where: any = { propertyId };
    if (activeOnly) {
        where.isActive = true;
    }

    const [rules, total] = await Promise.all([
        prisma.dynamicPricingRule.findMany({
            where,
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.dynamicPricingRule.count({ where }),
    ]);

    return {
        rules: rules.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            conditions: r.conditions as DynamicPricingCondition,
            adjustmentType: r.adjustmentType,
            adjustmentValue: r.adjustmentValue.toNumber(),
            priority: r.priority,
            validFrom: r.validFrom,
            validUntil: r.validUntil,
            isActive: r.isActive,
            roomTypes: r.roomTypes,
            createdAt: r.createdAt,
        })),
        total,
        pages: Math.ceil(total / perPage),
        page,
    };
}
