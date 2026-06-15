// packages/db/src/queries/lateCheckoutQueries.ts
// Query helpers for Late Checkout Fee calculation and application

import prisma from '../index';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LateCheckoutFeeResult = {
    eligible: boolean;
    fee: number;
    checkoutTime: Date;
    originalCheckoutTime: Date;
    hoursLate: number;
    chargeType: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY' | 'FLAT_FEE';
    reason?: string;
};

export type ApplyLateCheckoutFeeData = {
    bookingId: string;
    fee: number;
    appliedById: string;
    description?: string;
};

// ─── Calculate Late Checkout Fee ─────────────────────────────────────────────

/**
 * Calculate late checkout fee based on hotel settings and actual checkout time
 */
export async function calculateLateCheckoutFee(bookingId: string): Promise<LateCheckoutFeeResult> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            room: {
                include: {
                    roomType: true,
                },
            },
        },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.status !== 'CHECKED_IN') {
        return {
            eligible: false,
            fee: 0,
            checkoutTime: new Date(),
            originalCheckoutTime: booking.checkOut,
            hoursLate: 0,
            chargeType: 'HALF_DAY',
            reason: 'Booking is not checked in',
        };
    }

    // Get hotel settings
    const settings = await prisma.hotelSettings.findUnique({
        where: { id: 'default' },
    });

    if (!settings?.lateCheckoutEnabled) {
        return {
            eligible: false,
            fee: 0,
            checkoutTime: new Date(),
            originalCheckoutTime: booking.checkOut,
            hoursLate: 0,
            chargeType: 'HALF_DAY',
            reason: 'Late checkout is not enabled',
        };
    }

    const cutoffHour = settings.lateCheckoutCutoffHour || 12;
    const maxHour = settings.lateCheckoutMaxHour || 16;
    const chargeType = (settings.lateCheckoutChargeType as 'HOURLY' | 'HALF_DAY' | 'FULL_DAY' | 'FLAT_FEE') || 'HALF_DAY';
    const explicitFee = settings.lateCheckoutFee?.toNumber() || 0;

    const now = new Date();
    const originalCheckoutTime = booking.checkOut;

    // Set checkout time to now for calculation
    const checkoutTime = new Date(now);

    // Calculate hours past cutoff
    const checkoutHour = checkoutTime.getHours();
    const hoursLate = Math.max(0, checkoutHour - cutoffHour);

    // Check if eligible
    if (checkoutHour <= cutoffHour) {
        return {
            eligible: false,
            fee: 0,
            checkoutTime,
            originalCheckoutTime,
            hoursLate: 0,
            chargeType,
            reason: 'Checkout is before cutoff hour',
        };
    }

    if (checkoutHour > maxHour) {
        return {
            eligible: false,
            fee: 0,
            checkoutTime,
            originalCheckoutTime,
            hoursLate: hoursLate,
            chargeType,
            reason: `Checkout time exceeds maximum allowed hour (${maxHour}:00)`,
        };
    }

    // Calculate fee based on charge type
    let fee = 0;
    const baseRate = booking.room.roomType?.basePrice?.toNumber() || booking.baseAmount.toNumber();

    switch (chargeType) {
        case 'FLAT_FEE':
            fee = explicitFee;
            break;
        case 'HOURLY':
            fee = (baseRate / 24) * hoursLate;
            break;
        case 'HALF_DAY':
            fee = baseRate / 2;
            break;
        case 'FULL_DAY':
            fee = baseRate;
            break;
        default:
            fee = baseRate / 2;
    }

    return {
        eligible: true,
        fee: Math.round(fee * 100) / 100, // Round to 2 decimal places
        checkoutTime,
        originalCheckoutTime,
        hoursLate,
        chargeType,
    };
}

// ─── Apply Late Checkout Fee ─────────────────────────────────────────────────

/**
 * Apply late checkout fee as a folio charge
 */
export async function applyLateCheckoutFee(data: ApplyLateCheckoutFeeData) {
    const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        include: {
            folio: true,
        },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    // Get or create folio
    let folio = booking.folio;
    if (!folio) {
        folio = await prisma.folio.create({
            data: {
                folioNumber: `FOL-${Date.now()}`,
                bookingId: data.bookingId,
                type: 'GUEST',
            },
        });
    }

    // Calculate tax (assuming 18% GST)
    const amount = data.fee;
    const cgst = amount * 0.09;
    const sgst = amount * 0.09;
    const totalAmount = amount + cgst + sgst;

    // Create folio charge
    const charge = await prisma.folioCharge.create({
        data: {
            folioId: folio.id,
            type: 'OTHER',
            description: data.description || 'Late checkout fee',
            amount: new Decimal(amount),
            cgst: new Decimal(cgst),
            sgst: new Decimal(sgst),
            totalAmount: new Decimal(totalAmount),
            chargeDate: new Date(),
        },
    });

    // Update booking extras amount
    const currentExtras = booking.extrasAmount?.toNumber() || 0;
    await prisma.booking.update({
        where: { id: data.bookingId },
        data: {
            extrasAmount: new Decimal(currentExtras + totalAmount),
            checkoutType: 'LATE',
        },
    });

    return {
        charge: {
            id: charge.id,
            amount: charge.amount,
            cgst: charge.cgst,
            sgst: charge.sgst,
            totalAmount: charge.totalAmount,
        },
        folio: {
            id: folio.id,
            folioNumber: folio.folioNumber,
        },
    };
}

// ─── Check Late Checkout Eligibility ─────────────────────────────────────────

/**
 * Check if a booking is eligible for late checkout
 */
export async function checkLateCheckoutEligibility(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.status !== 'CHECKED_IN') {
        return {
            eligible: false,
            reason: 'Booking is not checked in',
        };
    }

    const settings = await prisma.hotelSettings.findUnique({
        where: { id: 'default' },
    });

    if (!settings?.lateCheckoutEnabled) {
        return {
            eligible: false,
            reason: 'Late checkout is not enabled',
        };
    }

    const cutoffHour = settings.lateCheckoutCutoffHour || 12;
    const maxHour = settings.lateCheckoutMaxHour || 16;

    return {
        eligible: true,
        cutoffHour,
        maxHour,
        chargeType: settings.lateCheckoutChargeType,
        explicitFee: settings.lateCheckoutFee?.toNumber() || null,
    };
}
