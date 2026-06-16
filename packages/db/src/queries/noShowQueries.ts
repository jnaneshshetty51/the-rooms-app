import prisma from '../index';

/**
 * ─── No-Show Report Queries ──────────────────────────────────────────────────
 *
 * Functions for:
 * - Scenario 61: No-show report
 */

// ─── No-Show Report (Scenario 61) ────────────────────────────────────────────

export interface NoShowReport {
    propertyId: string;
    startDate: Date;
    endDate: Date;
    totalNoShows: number;
    noShowRate: number;
    totalCharges: number;
    collectedCharges: number;
    pendingCharges: number;
    bySource: Array<{
        source: string;
        count: number;
        charges: number;
    }>;
}

export interface NoShowRate {
    propertyId: string;
    date: Date;
    expectedArrivals: number;
    noShows: number;
    noShowRate: number;
}

export interface NoShowBooking {
    id: string;
    bookingNumber: string;
    guestName: string;
    guestPhone: string;
    roomNumber: string;
    checkIn: Date;
    totalAmount: number;
    noShowCharge: number | null;
    noShowAt: Date | null;
    source: string;
}

export interface ProcessNoShowResult {
    processed: number;
    alreadyProcessed: number;
    failed: number;
    bookings: Array<{
        bookingId: string;
        bookingNumber: string;
        guestName: string;
        noShowCharge: number;
        status: 'PROCESSED' | 'ALREADY_PROCESSED' | 'FAILED';
        error?: string;
    }>;
}

/**
 * Get no-show report for a date range
 */
export async function getNoShowReport(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<NoShowReport> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all no-show bookings
    const noShows = await prisma.booking.findMany({
        where: {
            propertyId,
            status: 'NO_SHOW',
            noShowAt: { gte: startOfDay, lte: endOfDay },
        },
        select: {
            bookingSource: true,
            noShowCharge: true,
            totalAmount: true,
            guest: { select: { name: true } },
        },
    });

    // Get expected arrivals (bookings with checkIn on those dates that didn't show)
    const expectedArrivals = await prisma.booking.count({
        where: {
            propertyId,
            checkIn: { gte: startOfDay, lte: endOfDay },
            status: { in: ['CONFIRMED', 'NO_SHOW'] },
        },
    });

    const totalNoShows = noShows.length;
    const totalCharges = noShows.reduce((sum, b) => sum + Number(b.noShowCharge || 0), 0);
    const collectedCharges = noShows.reduce((sum, b) => {
        // If noShowCharge is set and booking is paid/refunded, consider it collected
        return sum + Number(b.noShowCharge || 0);
    }, 0);

    // Group by source
    const sourceMap = new Map<string, { count: number; charges: number }>();
    for (const booking of noShows) {
        const source = booking.bookingSource;
        const existing = sourceMap.get(source) || { count: 0, charges: 0 };
        existing.count++;
        existing.charges += Number(booking.noShowCharge || 0);
        sourceMap.set(source, existing);
    }

    const bySource = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        count: data.count,
        charges: data.charges,
    }));

    return {
        propertyId,
        startDate: startOfDay,
        endDate: endOfDay,
        totalNoShows,
        noShowRate: expectedArrivals > 0 ? (totalNoShows / expectedArrivals) * 100 : 0,
        totalCharges,
        collectedCharges,
        pendingCharges: totalCharges - collectedCharges,
        bySource,
    };
}

/**
 * Get no-show rate for a date range
 */
export async function getNoShowRate(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<NoShowRate> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [expectedArrivals, noShows] = await Promise.all([
        prisma.booking.count({
            where: {
                propertyId,
                checkIn: { gte: startOfDay, lte: endOfDay },
                status: { in: ['CONFIRMED', 'NO_SHOW'] },
            },
        }),
        prisma.booking.count({
            where: {
                propertyId,
                status: 'NO_SHOW',
                noShowAt: { gte: startOfDay, lte: endOfDay },
            },
        }),
    ]);

    return {
        propertyId,
        date: startOfDay,
        expectedArrivals,
        noShows,
        noShowRate: expectedArrivals > 0 ? (noShows / expectedArrivals) * 100 : 0,
    };
}

/**
 * Get list of no-show bookings
 */
export async function getNoShowBookings(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<NoShowBooking[]> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            status: 'NO_SHOW',
            noShowAt: { gte: startOfDay, lte: endOfDay },
        },
        select: {
            id: true,
            bookingNumber: true,
            checkIn: true,
            totalAmount: true,
            noShowCharge: true,
            noShowAt: true,
            bookingSource: true,
            guest: {
                select: {
                    name: true,
                    phone: true,
                },
            },
            room: { select: { roomNumber: true } },
        },
        orderBy: { noShowAt: 'desc' },
    });

    return bookings.map(b => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        guestName: b.guest.name,
        guestPhone: b.guest.phone,
        roomNumber: b.room.roomNumber,
        checkIn: b.checkIn,
        totalAmount: Number(b.totalAmount),
        noShowCharge: b.noShowCharge ? Number(b.noShowCharge) : null,
        noShowAt: b.noShowAt,
        source: b.bookingSource,
    }));
}

/**
 * Process no-shows for a specific date
 * Marks unchecked-in bookings that have passed their check-in time as no-shows
 */
export async function processNoShows(
    propertyId: string,
    date: Date
): Promise<ProcessNoShowResult> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get hotel settings for no-show policy
    const settings = await prisma.hotelSettings.findFirst();

    // Get bookings that should be marked as no-show
    // - Confirmed bookings with checkIn on this date
    // - That haven't been checked in
    const potentialNoShows = await prisma.booking.findMany({
        where: {
            propertyId,
            checkIn: { gte: startOfDay, lte: endOfDay },
            status: 'CONFIRMED',
        },
        include: {
            guest: { select: { name: true } },
            room: { select: { roomNumber: true } },
        },
    });

    const result: ProcessNoShowResult = {
        processed: 0,
        alreadyProcessed: 0,
        failed: 0,
        bookings: [],
    };

    for (const booking of potentialNoShows) {
        try {
            // Check if already processed as no-show
            if (booking.noShowAt) {
                result.bookings.push({
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    guestName: booking.guest.name,
                    noShowCharge: Number(booking.noShowCharge || 0),
                    status: 'ALREADY_PROCESSED',
                });
                result.alreadyProcessed++;
                continue;
            }

            // Calculate no-show charge based on policy
            let noShowCharge = new Prisma.Decimal(0);
            const chargeType = settings?.noShowChargeType || 'FIRST_NIGHT';
            const chargeValue = settings?.noShowChargeValue;

            if (chargeType === 'FIRST_NIGHT') {
                // Charge = baseAmount for one night (approximate)
                noShowCharge = booking.baseAmount;
            } else if (chargeType === 'PERCENTAGE' && chargeValue) {
                noShowCharge = booking.totalAmount.mul(chargeValue).div(100);
            } else if (chargeType === 'FLAT_FEE' && chargeValue) {
                noShowCharge = chargeValue;
            }

            // Update booking status to NO_SHOW
            await prisma.booking.update({
                where: { id: booking.id },
                data: {
                    status: 'NO_SHOW',
                    noShowAt: new Date(),
                    noShowCharge,
                },
            });

            result.bookings.push({
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                guestName: booking.guest.name,
                noShowCharge: Number(noShowCharge),
                status: 'PROCESSED',
            });
            result.processed++;
        } catch (error) {
            result.bookings.push({
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                guestName: booking.guest.name,
                noShowCharge: 0,
                status: 'FAILED',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            result.failed++;
        }
    }

    return result;
}

// Need to import Prisma for Decimal
import { Prisma } from '@prisma/client';
