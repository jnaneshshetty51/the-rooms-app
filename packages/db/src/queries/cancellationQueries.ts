import prisma from '../index';

/**
 * ─── Cancellation Report Queries ────────────────────────────────────────────
 *
 * Functions for:
 * - Scenario 60: Cancellation report
 */

// ─── Cancellation Report (Scenario 60) ───────────────────────────────────────

export interface CancellationReport {
    totalBookings: number;
    cancelledBookings: number;
    cancellationRate: number;
    totalRevenue: number;
    cancelledRevenue: number;
    bySource: Array<{
        source: string;
        count: number;
        rate: number;
    }>;
    byMonth: Array<{
        month: string;
        count: number;
        rate: number;
    }>;
}

export interface CancellationRate {
    propertyId: string;
    startDate: Date;
    endDate: Date;
    totalBookings: number;
    cancelledBookings: number;
    cancellationRate: number;
}

export interface CancelledBooking {
    id: string;
    bookingNumber: string;
    guestName: string;
    roomNumber: string;
    checkIn: Date;
    checkOut: Date;
    cancelledAt: Date;
    totalAmount: number;
    source: string;
}

export interface CancellationReasonBreakdown {
    reason: string;
    count: number;
    percentage: number;
    totalRevenue: number;
}

/**
 * Get cancellation report for a date range
 */
export async function getCancellationReport(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<CancellationReport> {
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
            id: true,
            bookingNumber: true,
            bookingSource: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            guest: { select: { name: true } },
            room: { select: { roomNumber: true } },
        },
    });

    const totalBookings = bookings.length;
    const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');
    const cancelledCount = cancelledBookings.length;

    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const cancelledRevenue = cancelledBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);

    // Group by source
    const sourceMap = new Map<string, { total: number; cancelled: number }>();
    for (const booking of bookings) {
        const source = booking.bookingSource;
        const existing = sourceMap.get(source) || { total: 0, cancelled: 0 };
        existing.total++;
        if (booking.status === 'CANCELLED') {
            existing.cancelled++;
        }
        sourceMap.set(source, existing);
    }

    const bySource = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        count: data.cancelled,
        rate: data.total > 0 ? (data.cancelled / data.total) * 100 : 0,
    }));

    // Group by month
    const monthMap = new Map<string, { total: number; cancelled: number }>();
    for (const booking of bookings) {
        const month = `${booking.createdAt.getFullYear()}-${String(booking.createdAt.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthMap.get(month) || { total: 0, cancelled: 0 };
        existing.total++;
        if (booking.status === 'CANCELLED') {
            existing.cancelled++;
        }
        monthMap.set(month, existing);
    }

    const byMonth = Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
            month,
            count: data.cancelled,
            rate: data.total > 0 ? (data.cancelled / data.total) * 100 : 0,
        }));

    return {
        totalBookings,
        cancelledBookings: cancelledCount,
        cancellationRate: totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0,
        totalRevenue,
        cancelledRevenue,
        bySource,
        byMonth,
    };
}

/**
 * Get cancellation rate for a date range
 */
export async function getCancellationRate(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<CancellationRate> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [totalBookings, cancelledBookings] = await Promise.all([
        prisma.booking.count({
            where: {
                propertyId,
                createdAt: { gte: startOfDay, lte: endOfDay },
            },
        }),
        prisma.booking.count({
            where: {
                propertyId,
                createdAt: { gte: startOfDay, lte: endOfDay },
                status: 'CANCELLED',
            },
        }),
    ]);

    return {
        propertyId,
        startDate: startOfDay,
        endDate: endOfDay,
        totalBookings,
        cancelledBookings,
        cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
    };
}

/**
 * Get list of cancelled bookings
 */
export async function getCancelledBookings(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<CancelledBooking[]> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: 'CANCELLED',
        },
        select: {
            id: true,
            bookingNumber: true,
            checkIn: true,
            checkOut: true,
            totalAmount: true,
            bookingSource: true,
            updatedAt: true,
            guest: { select: { name: true } },
            room: { select: { roomNumber: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    return bookings.map(b => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        guestName: b.guest.name,
        roomNumber: b.room.roomNumber,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        cancelledAt: b.updatedAt,
        totalAmount: Number(b.totalAmount),
        source: b.bookingSource,
    }));
}

/**
 * Get cancellation reasons breakdown
 * Note: This requires cancellation reason to be stored - using specialRequests as proxy
 */
export async function getCancellationReasons(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<CancellationReasonBreakdown[]> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: 'CANCELLED',
        },
        select: {
            specialRequests: true,
            totalAmount: true,
        },
    });

    // Group by reason (using specialRequests as cancellation reason if available)
    const reasonMap = new Map<string, { count: number; revenue: number }>();

    for (const booking of bookings) {
        const reason = booking.specialRequests || 'Not specified';
        const existing = reasonMap.get(reason) || { count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += Number(booking.totalAmount);
        reasonMap.set(reason, existing);
    }

    const total = bookings.length;

    return Array.from(reasonMap.entries())
        .map(([reason, data]) => ({
            reason,
            count: data.count,
            percentage: total > 0 ? (data.count / total) * 100 : 0,
            totalRevenue: data.revenue,
        }))
        .sort((a, b) => b.count - a.count);
}
