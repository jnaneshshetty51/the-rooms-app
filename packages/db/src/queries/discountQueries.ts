// packages/db/src/queries/discountQueries.ts
// Discount code queries and validation logic

import prisma from '../index';
import { Prisma, RoomType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type DiscountCodeWithUsage = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: Prisma.Decimal;
    validFrom: Date | null;
    validUntil: Date | null;
    maxUses: number | null;
    currentUses: number;
    maxUsesPerUser: number | null;
    minNights: number;
    maxNights: number | null;
    minBookingValue: Prisma.Decimal | null;
    maxBookingValue: Prisma.Decimal | null;
    applicableRoomTypes: RoomType[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type ValidationResult = {
    isValid: boolean;
    error?: string;
    discount?: DiscountCodeWithUsage;
    discountAmount?: number;
};

/**
 * Get all discount codes
 */
export async function getAllDiscountCodes() {
    return prisma.discountCode.findMany({
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Get a discount code by code string
 */
export async function getDiscountCodeByCode(code: string) {
    return prisma.discountCode.findUnique({
        where: { code: code.toUpperCase() },
    });
}

/**
 * Get a discount code by ID
 */
export async function getDiscountCodeById(id: string) {
    return prisma.discountCode.findUnique({
        where: { id },
    });
}

/**
 * Create a new discount code
 */
export async function createDiscountCode(data: {
    code: string;
    name: string;
    description?: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    validFrom?: Date;
    validUntil?: Date;
    maxUses?: number;
    maxUsesPerUser?: number;
    minNights?: number;
    maxNights?: number;
    minBookingValue?: number;
    maxBookingValue?: number;
    applicableRoomTypes?: RoomType[];
    isActive?: boolean;
}) {
    return prisma.discountCode.create({
        data: {
            code: data.code.toUpperCase(),
            name: data.name,
            description: data.description,
            type: data.type,
            value: new Decimal(data.value),
            validFrom: data.validFrom,
            validUntil: data.validUntil,
            maxUses: data.maxUses,
            maxUsesPerUser: data.maxUsesPerUser,
            minNights: data.minNights ?? 1,
            maxNights: data.maxNights,
            minBookingValue: data.minBookingValue ? new Decimal(data.minBookingValue) : null,
            maxBookingValue: data.maxBookingValue ? new Decimal(data.maxBookingValue) : null,
            applicableRoomTypes: data.applicableRoomTypes ?? [],
            isActive: data.isActive ?? true,
        },
    });
}

/**
 * Update a discount code
 */
export async function updateDiscountCode(
    id: string,
    data: Partial<{
        name: string;
        description: string;
        type: 'PERCENTAGE' | 'FIXED_AMOUNT';
        value: number;
        validFrom: Date;
        validUntil: Date;
        maxUses: number;
        maxUsesPerUser: number;
        minNights: number;
        maxNights: number;
        minBookingValue: number;
        maxBookingValue: number;
        applicableRoomTypes: RoomType[];
        isActive: boolean;
    }>
) {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.value !== undefined) updateData.value = new Decimal(data.value);
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
    if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
    if (data.maxUsesPerUser !== undefined) updateData.maxUsesPerUser = data.maxUsesPerUser;
    if (data.minNights !== undefined) updateData.minNights = data.minNights;
    if (data.maxNights !== undefined) updateData.maxNights = data.maxNights;
    if (data.minBookingValue !== undefined) updateData.minBookingValue = data.minBookingValue ? new Decimal(data.minBookingValue) : null;
    if (data.maxBookingValue !== undefined) updateData.maxBookingValue = data.maxBookingValue ? new Decimal(data.maxBookingValue) : null;
    if (data.applicableRoomTypes !== undefined) updateData.applicableRoomTypes = data.applicableRoomTypes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return prisma.discountCode.update({
        where: { id },
        data: updateData,
    });
}

/**
 * Deactivate a discount code (soft delete)
 */
export async function deactivateDiscountCode(id: string) {
    return prisma.discountCode.update({
        where: { id },
        data: { isActive: false },
    });
}

/**
 * Increment usage count for a discount code
 */
export async function incrementDiscountUsage(id: string) {
    return prisma.discountCode.update({
        where: { id },
        data: { currentUses: { increment: 1 } },
    });
}

/**
 * Validate a discount code for a booking
 * Checks: existence, active status, validity dates, usage limits, nights requirements, booking value, room types
 */
export async function validateDiscountCode(
    code: string,
    options: {
        checkIn: Date;
        checkOut: Date;
        roomType?: RoomType;
        subtotal?: number; // booking subtotal before discount
    }
): Promise<ValidationResult> {
    const discount = await getDiscountCodeByCode(code);

    if (!discount) {
        return { isValid: false, error: 'Discount code not found' };
    }

    if (!discount.isActive) {
        return { isValid: false, error: 'This discount code is no longer active' };
    }

    // Check validity dates
    const now = new Date();
    if (discount.validFrom && discount.validFrom > now) {
        return { isValid: false, error: 'This discount code is not yet valid' };
    }
    if (discount.validUntil && discount.validUntil < now) {
        return { isValid: false, error: 'This discount code has expired' };
    }

    // Check usage limit
    if (discount.maxUses !== null && discount.currentUses >= discount.maxUses) {
        return { isValid: false, error: 'This discount code has reached its usage limit' };
    }

    // Calculate nights
    const nights = Math.max(1, Math.ceil(
        (new Date(options.checkOut).getTime() - new Date(options.checkIn).getTime()) / 86400000
    ));

    // Check min/max nights
    if (nights < discount.minNights) {
        return { isValid: false, error: `This discount requires a minimum of ${discount.minNights} night(s)` };
    }
    if (discount.maxNights !== null && nights > discount.maxNights) {
        return { isValid: false, error: `This discount is valid for stays up to ${discount.maxNights} night(s)` };
    }

    // Check booking value
    if (options.subtotal !== undefined) {
        if (discount.minBookingValue) {
            const minVal = Number(discount.minBookingValue);
            if (options.subtotal < minVal) {
                return { isValid: false, error: `Minimum booking value of ₹${minVal.toLocaleString('en-IN')} required` };
            }
        }
        if (discount.maxBookingValue) {
            const maxVal = Number(discount.maxBookingValue);
            if (options.subtotal > maxVal) {
                return { isValid: false, error: `This discount is valid for bookings up to ₹${maxVal.toLocaleString('en-IN')}` };
            }
        }
    }

    // Check room type restrictions
    if (options.roomType && discount.applicableRoomTypes.length > 0) {
        if (!discount.applicableRoomTypes.includes(options.roomType)) {
            return { isValid: false, error: 'This discount is not applicable for the selected room type' };
        }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === 'PERCENTAGE') {
        const subtotal = options.subtotal ?? 0;
        discountAmount = subtotal * (Number(discount.value) / 100);
        // Cap at 100% for percentage
        discountAmount = Math.min(discountAmount, subtotal);
    } else {
        // FIXED_AMOUNT - cannot exceed subtotal
        discountAmount = Math.min(Number(discount.value), options.subtotal ?? Number(discount.value));
    }

    return {
        isValid: true,
        discount: discount as DiscountCodeWithUsage,
        discountAmount,
    };
}

/**
 * Calculate discount amount for a booking
 */
export function calculateDiscountAmount(
    discount: DiscountCodeWithUsage,
    subtotal: number
): number {
    if (discount.type === 'PERCENTAGE') {
        const amount = subtotal * (Number(discount.value) / 100);
        return Math.min(amount, subtotal);
    } else {
        return Math.min(Number(discount.value), subtotal);
    }
}
