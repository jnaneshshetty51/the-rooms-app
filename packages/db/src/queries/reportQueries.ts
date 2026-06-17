import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * ─── Report Queries ─────────────────────────────────────────────────────────
 *
 * Functions for:
 * - Scenario 56: Daily occupancy report
 * - Scenario 57: Revenue per room (RevPAR)
 * - Scenario 58: ADR (Average Daily Rate)
 */

// ─── Daily Occupancy Report (Scenario 56) ────────────────────────────────────

export interface DailyOccupancyReportData {
    propertyId: string;
    reportDate: Date;
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    outOfOrderRooms: number;
    outOfServiceRooms: number;
    studioOccupied: number;
    studioTotal: number;
    premiumOccupied: number;
    premiumTotal: number;
    occupancyPercent: number;
    arrivals: number;
    departures: number;
    noShows: number;
}

/**
 * Generate or update daily occupancy report for a property
 */
export async function generateDailyOccupancyReport(
    propertyId: string,
    date: Date
): Promise<DailyOccupancyReportData> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.$transaction(async (tx) => {
        // Get all rooms for the property
        const allRooms = await tx.room.findMany({
            where: { propertyId },
        });

        const totalRooms = allRooms.length;
        const outOfOrderRooms = allRooms.filter(r => r.status === 'MAINTENANCE').length;
        const outOfServiceRooms = allRooms.filter(r => r.status === 'BLOCKED').length;
        const availableRooms = totalRooms - outOfOrderRooms - outOfServiceRooms;

        // Get room counts by type
        const studioRooms = allRooms.filter(r => r.type === 'STUDIO');
        const premiumRooms = allRooms.filter(r => r.type === 'PREMIUM');

        // Get bookings that were active on this date
        const activeBookings = await tx.booking.findMany({
            where: {
                propertyId,
                status: { in: ['CHECKED_IN'] },
                checkIn: { lte: endOfDay },
                checkOut: { gt: startOfDay },
            },
            include: {
                room: true,
            },
        });

        const occupiedRooms = activeBookings.length;
        const studioOccupied = activeBookings.filter(b => b.room.type === 'STUDIO').length;
        const premiumOccupied = activeBookings.filter(b => b.room.type === 'PREMIUM').length;

        // Calculate occupancy percentage
        const occupancyPercent = availableRooms > 0
            ? (occupiedRooms / availableRooms) * 100
            : 0;

        // Get arrivals (bookings checking in today)
        const arrivals = await tx.booking.count({
            where: {
                propertyId,
                checkIn: { gte: startOfDay, lte: endOfDay },
                status: { in: ['CHECKED_IN', 'CONFIRMED'] },
            },
        });

        // Get departures (bookings checking out today)
        const departures = await tx.booking.count({
            where: {
                propertyId,
                checkOut: { gte: startOfDay, lte: endOfDay },
                status: { in: ['CHECKED_OUT'] },
            },
        });

        // Get no-shows for this date
        const noShows = await tx.booking.count({
            where: {
                propertyId,
                noShowAt: { gte: startOfDay, lte: endOfDay },
                status: 'NO_SHOW',
            },
        });

        const reportData: DailyOccupancyReportData = {
            propertyId,
            reportDate: startOfDay,
            totalRooms,
            availableRooms,
            occupiedRooms,
            outOfOrderRooms,
            outOfServiceRooms,
            studioOccupied,
            studioTotal: studioRooms.length,
            premiumOccupied,
            premiumTotal: premiumRooms.length,
            occupancyPercent,
            arrivals,
            departures,
            noShows,
        };

        // Upsert the report
        await tx.dailyOccupancyReport.upsert({
            where: {
                propertyId_reportDate: {
                    propertyId,
                    reportDate: startOfDay,
                },
            },
            create: reportData,
            update: reportData,
        });

        return reportData;
    });
}

/**
 * Get daily occupancy report for a specific date
 */
export async function getDailyOccupancyReport(propertyId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    return prisma.dailyOccupancyReport.findUnique({
        where: {
            propertyId_reportDate: {
                propertyId,
                reportDate: startOfDay,
            },
        },
    });
}

/**
 * Get occupancy reports for a date range
 */
export async function getOccupancyReports(
    propertyId: string,
    startDate: Date,
    endDate: Date
) {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.dailyOccupancyReport.findMany({
        where: {
            propertyId,
            reportDate: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
        orderBy: { reportDate: 'asc' },
    });
}

/**
 * Get occupancy trend for the last N days
 */
export async function getOccupancyTrend(propertyId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return getOccupancyReports(propertyId, startDate, endDate);
}

// ─── RevPAR (Scenario 57) ────────────────────────────────────────────────────

export interface RevPARData {
    date: Date;
    propertyId: string;
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    occupancyRate: number;
    adr: number;
    revpar: number;
    roomRevenue: number;
}

/**
 * Calculate RevPAR for a specific date
 * RevPAR = ADR × Occupancy Rate
 * RevPAR = Total Room Revenue / Available Rooms
 */
export async function calculateRevPAR(propertyId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.$transaction(async (tx) => {
        // Get room counts
        const totalRooms = await tx.room.count({
            where: { propertyId },
        });

        const availableRooms = totalRooms; // Could subtract maintenance/blocked

        // Get checked-in bookings and their revenue
        const activeBookings = await tx.booking.findMany({
            where: {
                propertyId,
                status: 'CHECKED_IN',
                checkIn: { lte: endOfDay },
                checkOut: { gt: startOfDay },
            },
            include: {
                payments: {
                    where: { status: 'PAID' },
                },
            },
        });

        const occupiedRooms = activeBookings.length;

        // Calculate total room revenue from payments
        let totalRoomRevenue = new Prisma.Decimal(0);
        for (const booking of activeBookings) {
            for (const payment of booking.payments) {
                totalRoomRevenue = totalRoomRevenue.add(payment.amount);
            }
        }

        // Also include baseAmount from bookings as room revenue
        for (const booking of activeBookings) {
            totalRoomRevenue = totalRoomRevenue.add(booking.baseAmount);
        }

        // Calculate ADR (Average Daily Rate)
        const adr = occupiedRooms > 0
            ? Number(totalRoomRevenue) / occupiedRooms
            : 0;

        // Calculate Occupancy Rate
        const occupancyRate = availableRooms > 0
            ? (occupiedRooms / availableRooms) * 100
            : 0;

        // Calculate RevPAR
        const revpar = availableRooms > 0
            ? Number(totalRoomRevenue) / availableRooms
            : 0;

        return {
            date: startOfDay,
            propertyId,
            totalRooms,
            availableRooms,
            occupiedRooms,
            occupancyRate,
            adr,
            revpar,
            roomRevenue: Number(totalRoomRevenue),
        };
    });
}

/**
 * Get RevPAR report for a date range
 */
export async function getRevPARReport(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<RevPARData[]> {
    const reports: RevPARData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const report = await calculateRevPAR(propertyId, currentDate);
        reports.push(report);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return reports;
}

// ─── ADR (Scenario 58) ────────────────────────────────────────────────────────

export interface ADRData {
    date: Date;
    propertyId: string;
    occupiedRooms: number;
    totalRoomRevenue: number;
    adr: number;
    byRoomType: {
        studio: { occupied: number; revenue: number; adr: number };
        premium: { occupied: number; revenue: number; adr: number };
    };
}

/**
 * Calculate ADR for a specific date
 * ADR = Total Room Revenue / Occupied Rooms
 */
export async function calculateADR(propertyId: string, date: Date): Promise<ADRData> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.$transaction(async (tx) => {
        // Get active bookings
        const activeBookings = await tx.booking.findMany({
            where: {
                propertyId,
                status: 'CHECKED_IN',
                checkIn: { lte: endOfDay },
                checkOut: { gt: startOfDay },
            },
            include: {
                room: true,
                payments: {
                    where: { status: 'PAID' },
                },
            },
        });

        // Calculate revenue by room type
        let totalRoomRevenue = new Prisma.Decimal(0);
        let studioRevenue = new Prisma.Decimal(0);
        let premiumRevenue = new Prisma.Decimal(0);
        let studioOccupied = 0;
        let premiumOccupied = 0;

        for (const booking of activeBookings) {
            const roomRevenue = booking.baseAmount;
            totalRoomRevenue = totalRoomRevenue.add(roomRevenue);

            if (booking.room.type === 'STUDIO') {
                studioRevenue = studioRevenue.add(roomRevenue);
                studioOccupied++;
            } else {
                premiumRevenue = premiumRevenue.add(roomRevenue);
                premiumOccupied++;
            }
        }

        const occupiedRooms = activeBookings.length;

        // Calculate overall ADR
        const adr = occupiedRooms > 0
            ? Number(totalRoomRevenue) / occupiedRooms
            : 0;

        return {
            date: startOfDay,
            propertyId,
            occupiedRooms,
            totalRoomRevenue: Number(totalRoomRevenue),
            adr,
            byRoomType: {
                studio: {
                    occupied: studioOccupied,
                    revenue: Number(studioRevenue),
                    adr: studioOccupied > 0 ? Number(studioRevenue) / studioOccupied : 0,
                },
                premium: {
                    occupied: premiumOccupied,
                    revenue: Number(premiumRevenue),
                    adr: premiumOccupied > 0 ? Number(premiumRevenue) / premiumOccupied : 0,
                },
            },
        };
    });
}

/**
 * Get ADR report for a date range
 */
export async function getADRReport(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<ADRData[]> {
    const reports: ADRData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const report = await calculateADR(propertyId, currentDate);
        reports.push(report);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return reports;
}
