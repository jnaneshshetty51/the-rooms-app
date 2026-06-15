// packages/db/src/queries/extraBedQueries.ts
// Query helpers for Extra Bed management during stay

import prisma from '../index';
import { Prisma, BookingStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AddExtraBedData = {
    bookingId: string;
    quantity?: number;
    notes?: string;
};

export type RemoveExtraBedData = {
    bookingId: string;
    quantity?: number;
};

// ─── Add Extra Bed ───────────────────────────────────────────────────────────

/**
 * Add extra bed(s) to a booking
 */
export async function addExtraBed(data: AddExtraBedData) {
    const { bookingId, quantity = 1, notes } = data;

    return prisma.$transaction(async (tx) => {
        // Get booking with room
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: { room: true },
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
            throw new Error('Can only add extra beds to confirmed or checked-in bookings');
        }

        // Check if room has extra beds available
        const room = booking.room;
        const currentExtraBedsUsed = booking.extraBedsUsed || 0;
        const maxExtraBeds = room.extraBedsAvailable || 0;

        if (currentExtraBedsUsed + quantity > maxExtraBeds) {
            throw new Error(`Cannot add ${quantity} extra bed(s). Room only has ${maxExtraBeds - currentExtraBedsUsed} available (max: ${maxExtraBeds})`);
        }

        // Calculate extra bed charge
        const extraBedPrice = room.extraBedPrice?.toNumber() || 0;
        const chargeAmount = extraBedPrice * quantity;

        // Update booking extra beds used
        const updatedBooking = await tx.booking.update({
            where: { id: bookingId },
            data: {
                extraBedsUsed: currentExtraBedsUsed + quantity,
                extrasAmount: (booking.extrasAmount || new Decimal(0)).add(new Decimal(chargeAmount)),
                totalAmount: booking.totalAmount.add(new Decimal(chargeAmount)),
            },
        });

        // Create a BookingAddon record for tracking
        if (chargeAmount > 0) {
            await tx.bookingAddon.create({
                data: {
                    bookingId,
                    type: 'OTHER', // Extra bed addon type
                    description: `Extra bed(s) - ${quantity} unit(s)`,
                    amount: new Decimal(extraBedPrice),
                    quantity,
                    serviceDate: new Date(),
                    cgst: new Decimal(0),
                    sgst: new Decimal(0),
                    totalAmount: new Decimal(chargeAmount),
                },
            });
        }

        return {
            booking: updatedBooking,
            extraBedsAdded: quantity,
            chargeAmount,
            extraBedPrice,
        };
    });
}

// ─── Remove Extra Bed ────────────────────────────────────────────────────────

/**
 * Remove extra bed(s) from a booking
 */
export async function removeExtraBed(data: RemoveExtraBedData) {
    const { bookingId, quantity = 1 } = data;

    return prisma.$transaction(async (tx) => {
        // Get booking with room
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: { room: true },
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        const currentExtraBedsUsed = booking.extraBedsUsed || 0;

        if (currentExtraBedsUsed < quantity) {
            throw new Error(`Cannot remove ${quantity} extra bed(s). Booking only has ${currentExtraBedsUsed} extra bed(s) in use`);
        }

        // Calculate refund amount (no refund for extra beds - they're daily charges)
        // In a real implementation, you might want to handle partial refunds based on nights used

        // Update booking extra beds used
        const updatedBooking = await tx.booking.update({
            where: { id: bookingId },
            data: {
                extraBedsUsed: currentExtraBedsUsed - quantity,
            },
        });

        return {
            booking: updatedBooking,
            extraBedsRemoved: quantity,
        };
    });
}

// ─── Get Extra Bed Info ───────────────────────────────────────────────────────

/**
 * Get extra bed information for a booking
 */
export async function getExtraBedInfo(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { room: true },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    const currentExtraBedsUsed = booking.extraBedsUsed || 0;
    const maxExtraBeds = booking.room.extraBedsAvailable || 0;
    const extraBedPrice = booking.room.extraBedPrice?.toNumber() || 0;

    return {
        bookingId,
        currentExtraBedsUsed,
        maxExtraBeds,
        availableExtraBeds: maxExtraBeds - currentExtraBedsUsed,
        extraBedPrice,
        canAddMore: currentExtraBedsUsed < maxExtraBeds,
    };
}

// ─── Get Extra Bed Charges ────────────────────────────────────────────────────

/**
 * Calculate total extra bed charges for a booking
 */
export async function getExtraBedCharges(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            room: true,
            roomCharges: true,
        },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    const extraBedPrice = booking.room.extraBedPrice?.toNumber() || 0;
    const extraBedsUsed = booking.extraBedsUsed || 0;

    // Calculate nights stayed
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const totalCharge = extraBedPrice * extraBedsUsed * nights;

    return {
        extraBedPrice,
        extraBedsUsed,
        nights,
        totalCharge,
    };
}
