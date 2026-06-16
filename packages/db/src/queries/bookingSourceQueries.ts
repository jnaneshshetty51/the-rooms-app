import prisma from '../index';
import { BookingSource } from '@prisma/client';

/**
 * ─── Booking Source Analytics Queries ────────────────────────────────────────
 *
 * Functions for:
 * - Scenario 59: Booking source analytics (OTA vs direct)
 */

// ─── Booking Source Analytics (Scenario 59) ─────────────────────────────────

export interface BookingSourceData {
    source: BookingSource;
    bookingCount: number;
    totalRevenue: number;
    averageBookingValue: number;
    cancellationCount: number;
    cancellationRate: number;
}

export interface SourceContribution {
    source: BookingSource;
    bookingCount: number;
    percentage: number;
    revenue: number;
    revenuePercentage: number;
}

export interface OTAPerformance {
    channel: string;
    bookings: number;
    revenue: number;
    avgBookingValue: number;
    cancellationRate: number;
    avgLeadTimeDays: number;
}

/**
 * Get booking source analytics for a date range
 */
export async function getBookingSourceAnalytics(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<BookingSourceData[]> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all bookings in the date range
    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            createdAt: { gte: startOfDay, lte: endOfDay },
        },
        select: {
            bookingSource: true,
            totalAmount: true,
            status: true,
            baseAmount: true,
        },
    });

    // Group by booking source
    const sourceMap = new Map<BookingSource, {
        bookingCount: number;
        totalRevenue: number;
        cancellationCount: number;
    }>();

    for (const booking of bookings) {
        const existing = sourceMap.get(booking.bookingSource) || {
            bookingCount: 0,
            totalRevenue: 0,
            cancellationCount: 0,
        };

        existing.bookingCount++;
        existing.totalRevenue += Number(booking.totalAmount);
        if (booking.status === 'CANCELLED') {
            existing.cancellationCount++;
        }

        sourceMap.set(booking.bookingSource, existing);
    }

    // Convert to array
    const result: BookingSourceData[] = [];
    for (const [source, data] of sourceMap.entries()) {
        result.push({
            source,
            bookingCount: data.bookingCount,
            totalRevenue: data.totalRevenue,
            averageBookingValue: data.bookingCount > 0
                ? data.totalRevenue / data.bookingCount
                : 0,
            cancellationCount: data.cancellationCount,
            cancellationRate: data.bookingCount > 0
                ? (data.cancellationCount / data.bookingCount) * 100
                : 0,
        });
    }

    return result.sort((a, b) => b.bookingCount - a.bookingCount);
}

/**
 * Get source contribution (percentage breakdown)
 */
export async function getSourceContribution(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<SourceContribution[]> {
    const analytics = await getBookingSourceAnalytics(propertyId, startDate, endDate);

    const totalBookings = analytics.reduce((sum, a) => sum + a.bookingCount, 0);
    const totalRevenue = analytics.reduce((sum, a) => sum + a.totalRevenue, 0);

    return analytics.map(a => ({
        source: a.source,
        bookingCount: a.bookingCount,
        percentage: totalBookings > 0 ? (a.bookingCount / totalBookings) * 100 : 0,
        revenue: a.totalRevenue,
        revenuePercentage: totalRevenue > 0 ? (a.totalRevenue / totalRevenue) * 100 : 0,
    }));
}

/**
 * Get revenue by source
 */
export async function getSourceRevenue(
    propertyId: string,
    startDate: Date,
    endDate: Date
) {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await prisma.booking.groupBy({
        by: ['bookingSource'],
        where: {
            propertyId,
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: { not: 'CANCELLED' },
        },
        _sum: {
            totalAmount: true,
            baseAmount: true,
        },
        _count: {
            id: true,
        },
    });

    return result.map(r => ({
        source: r.bookingSource,
        bookingCount: r._count.id,
        totalRevenue: Number(r._sum.totalAmount || 0),
        roomRevenue: Number(r._sum.baseAmount || 0),
    }));
}

/**
 * Get OTA performance metrics
 * OTA channels: BOOKING_COM, EXPEDIA, AIRBNB, AGODA
 */
export async function getOTAPerformance(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<OTAPerformance[]> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const otaSources: BookingSource[] = ['OTA'];

    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            createdAt: { gte: startOfDay, lte: endOfDay },
            bookingSource: { in: otaSources },
        },
        select: {
            bookingSource: true,
            totalAmount: true,
            status: true,
            checkIn: true,
            checkOut: true,
            createdAt: true,
        },
    });

    // Group by OTA channel
    const channelMap = new Map<string, {
        bookings: number;
        revenue: number;
        cancellations: number;
        totalLeadTimeDays: number;
    }>();

    for (const booking of bookings) {
        const channel = booking.bookingSource;
        const existing = channelMap.get(channel) || {
            bookings: 0,
            revenue: 0,
            cancellations: 0,
            totalLeadTimeDays: 0,
        };

        existing.bookings++;
        existing.revenue += Number(booking.totalAmount);
        if (booking.status === 'CANCELLED') {
            existing.cancellations++;
        }

        // Calculate lead time (days between booking creation and check-in)
        const leadTimeDays = Math.max(0,
            Math.ceil((booking.checkIn.getTime() - booking.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        );
        existing.totalLeadTimeDays += leadTimeDays;

        channelMap.set(channel, existing);
    }

    // Convert to array
    const result: OTAPerformance[] = [];
    for (const [channel, data] of channelMap.entries()) {
        result.push({
            channel,
            bookings: data.bookings,
            revenue: data.revenue,
            avgBookingValue: data.bookings > 0 ? data.revenue / data.bookings : 0,
            cancellationRate: data.bookings > 0 ? (data.cancellations / data.bookings) * 100 : 0,
            avgLeadTimeDays: data.bookings > 0 ? data.totalLeadTimeDays / data.bookings : 0,
        });
    }

    return result.sort((a, b) => b.revenue - a.revenue);
}
