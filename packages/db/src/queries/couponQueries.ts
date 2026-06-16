// packages/db/src/queries/couponQueries.ts
// Coupon/discount code management - Scenario 78
// Extends existing DiscountCode model

import prisma from '../index';
import { Prisma, RoomType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type CouponType = 'PERCENTAGE' | 'FIXED' | 'FREE_NIGHT' | 'UPGRADE';

export type CouponWithUsage = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: CouponType;
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

export type CouponValidationResult = {
    isValid: boolean;
    error?: string;
    coupon?: CouponWithUsage;
    discountAmount?: number;
};

/**
 * Create a new coupon (extends DiscountCode)
 */
export async function createCoupon(data: {
    code: string;
    name: string;
    description?: string;
    type: CouponType;
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
            type: data.type as 'PERCENTAGE' | 'FIXED_AMOUNT',
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
 * Update a coupon
 */
export async function updateCoupon(
    couponId: string,
    data: Partial<{
        name: string;
        description: string;
        type: CouponType;
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
    if (data.type !== undefined) updateData.type = data.type as 'PERCENTAGE' | 'FIXED_AMOUNT';
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
        where: { id: couponId },
        data: updateData,
    });
}

/**
 * Validate a coupon for a booking
 */
export async function validateCoupon(
    code: string,
    bookingData: {
        checkIn: Date;
        checkOut: Date;
        roomType?: RoomType;
        subtotal?: number;
        guestId?: string;
    }
): Promise<CouponValidationResult> {
    const coupon = await prisma.discountCode.findUnique({
        where: { code: code.toUpperCase() },
    });

    if (!coupon) {
        return { isValid: false, error: 'Coupon code not found' };
    }

    if (!coupon.isActive) {
        return { isValid: false, error: 'This coupon is no longer active' };
    }

    // Check validity dates
    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) {
        return { isValid: false, error: 'This coupon is not yet valid' };
    }
    if (coupon.validUntil && coupon.validUntil < now) {
        return { isValid: false, error: 'This coupon has expired' };
    }

    // Check usage limit
    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
        return { isValid: false, error: 'This coupon has reached its usage limit' };
    }

    // Calculate nights
    const nights = Math.max(1, Math.ceil(
        (new Date(bookingData.checkOut).getTime() - new Date(bookingData.checkIn).getTime()) / 86400000
    ));

    // Check min/max nights
    if (nights < coupon.minNights) {
        return { isValid: false, error: `This coupon requires a minimum of ${coupon.minNights} night(s)` };
    }
    if (coupon.maxNights !== null && nights > coupon.maxNights) {
        return { isValid: false, error: `This coupon is valid for stays up to ${coupon.maxNights} night(s)` };
    }

    // Check booking value
    if (bookingData.subtotal !== undefined) {
        if (coupon.minBookingValue) {
            const minVal = Number(coupon.minBookingValue);
            if (bookingData.subtotal < minVal) {
                return { isValid: false, error: `Minimum booking value of ₹${minVal.toLocaleString('en-IN')} required` };
            }
        }
        if (coupon.maxBookingValue) {
            const maxVal = Number(coupon.maxBookingValue);
            if (bookingData.subtotal > maxVal) {
                return { isValid: false, error: `This coupon is valid for bookings up to ₹${maxVal.toLocaleString('en-IN')}` };
            }
        }
    }

    // Check room type restrictions
    if (bookingData.roomType && coupon.applicableRoomTypes.length > 0) {
        if (!coupon.applicableRoomTypes.includes(bookingData.roomType)) {
            return { isValid: false, error: 'This coupon is not applicable for the selected room type' };
        }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (bookingData.subtotal !== undefined) {
        if (coupon.type === 'PERCENTAGE') {
            discountAmount = bookingData.subtotal * (Number(coupon.value) / 100);
            discountAmount = Math.min(discountAmount, bookingData.subtotal);
        } else if (coupon.type === 'FIXED_AMOUNT') {
            discountAmount = Math.min(Number(coupon.value), bookingData.subtotal);
        }
    }

    return {
        isValid: true,
        coupon: coupon as CouponWithUsage,
        discountAmount,
    };
}

/**
 * Apply a coupon to a booking
 */
export async function applyCoupon(code: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            room: true,
            guest: true,
        },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    const validation = await validateCoupon(code, {
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        roomType: booking.room.type,
        subtotal: Number(booking.totalAmount),
        guestId: booking.guestId,
    });

    if (!validation.isValid) {
        throw new Error(validation.error);
    }

    // Update booking with coupon
    const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            discountCode: code.toUpperCase(),
            discountAmount: new Decimal(validation.discountAmount ?? 0),
        },
        include: {
            room: true,
            guest: true,
        },
    });

    // Increment coupon usage
    if (validation.coupon) {
        await prisma.discountCode.update({
            where: { id: validation.coupon.id },
            data: { currentUses: { increment: 1 } },
        });
    }

    return updatedBooking;
}

/**
 * Get coupons with filters
 */
export async function getCoupons(
    propertyId?: string,
    status?: 'active' | 'inactive' | 'expired' | 'all'
) {
    const now = new Date();
    const where: Record<string, unknown> = {};

    if (status === 'active') {
        where.isActive = true;
        where.OR = [
            { validFrom: null },
            { validFrom: { lte: now } },
        ];
        where.AND = [
            {
                OR: [
                    { validUntil: null },
                    { validUntil: { gte: now } },
                ],
            },
        ];
    } else if (status === 'inactive') {
        where.isActive = false;
    } else if (status === 'expired') {
        where.validUntil = { lt: now };
    }

    return prisma.discountCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Deactivate a coupon
 */
export async function deactivateCoupon(couponId: string) {
    return prisma.discountCode.update({
        where: { id: couponId },
        data: { isActive: false },
    });
}

/**
 * Get coupon usage statistics
 */
export async function getCouponUsageStats(couponId: string) {
    const coupon = await prisma.discountCode.findUnique({
        where: { id: couponId },
    });

    if (!coupon) {
        throw new Error('Coupon not found');
    }

    // Get bookings using this coupon
    const bookings = await prisma.booking.findMany({
        where: { discountCode: coupon.code },
        select: {
            id: true,
            totalAmount: true,
            checkIn: true,
            checkOut: true,
            status: true,
        },
    });

    const totalBookings = bookings.length;
    const totalDiscount = bookings.reduce(
        (sum, b) => sum + Number(b.discountAmount ?? 0),
        0
    );
    const activeBookings = bookings.filter(
        b => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN'
    ).length;

    return {
        coupon,
        stats: {
            totalUses: coupon.currentUses,
            totalBookings,
            activeBookings,
            totalDiscountGiven: totalDiscount,
            usagePercent: coupon.maxUses
                ? (coupon.currentUses / coupon.maxUses) * 100
                : null,
        },
    };
}

/**
 * Bulk generate coupons
 */
export async function bulkGenerateCoupons(
    count: number,
    prefix: string,
    data: {
        name: string;
        type: CouponType;
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
    }
) {
    const coupons = [];
    const timestamp = Date.now().toString(36).toUpperCase();

    for (let i = 0; i < count; i++) {
        const code = `${prefix}-${timestamp}-${String(i + 1).padStart(3, '0')}`;

        const coupon = await prisma.discountCode.create({
            data: {
                code,
                name: data.name,
                type: data.type as 'PERCENTAGE' | 'FIXED_AMOUNT',
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
                isActive: true,
            },
        });

        coupons.push(coupon);
    }

    return coupons;
}
