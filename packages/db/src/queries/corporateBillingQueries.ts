// packages/db/src/queries/corporateBillingQueries.ts
// Query helpers for Corporate Billing on Bookings

import prisma from '../index';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { validateCorporateCredit } from './corporateAccountQueries';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AssignCorporateBillingData = {
    bookingId: string;
    corporateAccountId: string;
    billingType?: 'COMPANY' | 'INDIVIDUAL';
    notes?: string;
};

export type RemoveCorporateBillingData = {
    bookingId: string;
    reason?: string;
};

// ─── Assign Corporate Billing ─────────────────────────────────────────────────

/**
 * Assign corporate account to a booking for billing
 */
export async function assignCorporateBilling(data: AssignCorporateBillingData) {
    const { bookingId, corporateAccountId, billingType = 'COMPANY', notes } = data;

    return prisma.$transaction(async (tx) => {
        // Get booking
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
            throw new Error('Can only assign corporate billing to confirmed or checked-in bookings');
        }

        // Check if corporate account exists and is active
        const corporateAccount = await tx.corporateAccount.findUnique({
            where: { id: corporateAccountId },
        });

        if (!corporateAccount) {
            throw new Error('Corporate account not found');
        }

        if (!corporateAccount.isActive) {
            throw new Error('Corporate account is inactive');
        }

        // Validate credit limit
        const bookingAmount = booking.totalAmount.toNumber();
        const creditValidation = await validateCorporateCredit(corporateAccountId, bookingAmount);

        if (!creditValidation.valid) {
            throw new Error(`Credit validation failed: ${creditValidation.error}`);
        }

        // Update booking with corporate account
        const updatedBooking = await tx.booking.update({
            where: { id: bookingId },
            data: {
                corporateAccountId,
                corporateBillingType: billingType,
                corporateBillingNotes: notes,
            },
            include: {
                corporateAccount: {
                    select: {
                        id: true,
                        companyName: true,
                        creditLimit: true,
                    },
                },
            },
        });

        return updatedBooking;
    });
}

// ─── Remove Corporate Billing ───────────────────────────────────────────────

/**
 * Remove corporate billing from a booking
 */
export async function removeCorporateBilling(data: RemoveCorporateBillingData) {
    const { bookingId, reason } = data;

    return prisma.$transaction(async (tx) => {
        // Get booking
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        if (!booking.corporateAccountId) {
            throw new Error('Booking does not have corporate billing assigned');
        }

        // Update booking to remove corporate account
        const updatedBooking = await tx.booking.update({
            where: { id: bookingId },
            data: {
                corporateAccountId: null,
                corporateBillingType: null,
                corporateBillingNotes: null,
            },
        });

        return updatedBooking;
    });
}

// ─── Get Corporate Billing Info ──────────────────────────────────────────────

/**
 * Get corporate billing information for a booking
 */
export async function getCorporateBillingInfo(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            corporateAccount: {
                select: {
                    id: true,
                    companyName: true,
                    companyGstin: true,
                    contactName: true,
                    contactEmail: true,
                    contactPhone: true,
                    creditLimit: true,
                    paymentTermsDays: true,
                    discountPercent: true,
                },
            },
        },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (!booking.corporateAccountId) {
        return {
            hasCorporateBilling: false,
            corporateAccount: null,
        };
    }

    // Get current credit usage
    const currentUsage = await prisma.booking.aggregate({
        where: {
            corporateAccountId: booking.corporateAccountId,
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        _sum: {
            totalAmount: true,
        },
    });

    const creditLimit = booking.corporateAccount?.creditLimit?.toNumber() || 0;
    const usedAmount = currentUsage._sum.totalAmount?.toNumber() || 0;

    return {
        hasCorporateBilling: true,
        corporateAccount: booking.corporateAccount,
        billingType: booking.corporateBillingType,
        notes: booking.corporateBillingNotes,
        creditLimit,
        currentUsage: usedAmount,
        availableCredit: creditLimit > 0 ? creditLimit - usedAmount : null,
    };
}

// ─── Transfer Corporate Billing ───────────────────────────────────────────────

/**
 * Transfer corporate billing from one booking to another (for room changes)
 */
export async function transferCorporateBilling(
    fromBookingId: string,
    toBookingId: string
) {
    return prisma.$transaction(async (tx) => {
        // Get source booking
        const fromBooking = await tx.booking.findUnique({
            where: { id: fromBookingId },
        });

        if (!fromBooking) {
            throw new Error('Source booking not found');
        }

        if (!fromBooking.corporateAccountId) {
            throw new Error('Source booking does not have corporate billing');
        }

        // Get target booking
        const toBooking = await tx.booking.findUnique({
            where: { id: toBookingId },
        });

        if (!toBooking) {
            throw new Error('Target booking not found');
        }

        // Transfer to target booking
        const updatedToBooking = await tx.booking.update({
            where: { id: toBookingId },
            data: {
                corporateAccountId: fromBooking.corporateAccountId,
                corporateBillingType: fromBooking.corporateBillingType,
                corporateBillingNotes: fromBooking.corporateBillingNotes,
            },
        });

        // Remove from source booking
        await tx.booking.update({
            where: { id: fromBookingId },
            data: {
                corporateAccountId: null,
                corporateBillingType: null,
                corporateBillingNotes: null,
            },
        });

        return updatedToBooking;
    });
}
