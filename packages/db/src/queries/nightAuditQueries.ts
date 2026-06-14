// packages/db/src/queries/nightAuditQueries.ts
// Night audit related database queries

import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * Check if a date is already closed for a property
 */
export async function isDateClosed(propertyId: string, date: Date): Promise<boolean> {
    const closeDate = new Date(date);
    closeDate.setHours(0, 0, 0, 0);

    const close = await prisma.propertyDailyClose.findFirst({
        where: { propertyId, closeDate },
    });

    return !!close;
}

/**
 * Get the latest close date for a property
 */
export async function getLatestCloseDate(propertyId: string): Promise<Date | null> {
    const close = await prisma.propertyDailyClose.findFirst({
        where: { propertyId },
        orderBy: { closeDate: 'desc' },
        select: { closeDate: true },
    });

    return close?.closeDate ?? null;
}

/**
 * Close a day for a property
 */
export async function closeDay(
    propertyId: string,
    closeDate: Date,
    closedById: string,
    stats: {
        totalCheckIns: number;
        totalCheckOuts: number;
        totalOccupied: number;
        totalRevenue: number;
        totalPayments: number;
        totalCharges: number;
        discrepancies: number;
    },
    notes?: string
) {
    const date = new Date(closeDate);
    date.setHours(0, 0, 0, 0);

    return prisma.propertyDailyClose.create({
        data: {
            propertyId,
            closeDate: date,
            closedById,
            totalCheckIns: stats.totalCheckIns,
            totalCheckOuts: stats.totalCheckOuts,
            totalOccupied: stats.totalOccupied,
            totalRevenue: new Prisma.Decimal(stats.totalRevenue),
            totalPayments: stats.totalPayments,
            totalCharges: stats.totalCharges,
            discrepancies: stats.discrepancies,
            notes,
        },
    });
}

/**
 * Get night audit report for a specific date
 */
export async function getNightAuditReport(propertyId: string, date: Date) {
    const closeDate = new Date(date);
    closeDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get close record if exists
    const closeRecord = await prisma.propertyDailyClose.findFirst({
        where: { propertyId, closeDate },
        include: { closedBy: { select: { id: true, name: true, email: true } } },
    });

    // Get all bookings for the day
    const [checkIns, checkOuts, checkedInBookings, payments, roomCharges, discrepancies] = await Promise.all([
        // Expected check-ins
        prisma.booking.findMany({
            where: {
                propertyId,
                checkIn: { gte: closeDate, lte: endOfDay },
                status: { in: ['CONFIRMED'] },
            },
            include: {
                guest: { select: { id: true, name: true, phone: true } },
                room: { select: { id: true, roomNumber: true, type: true } },
            },
            orderBy: { checkIn: 'asc' },
        }),
        // Expected check-outs
        prisma.booking.findMany({
            where: {
                propertyId,
                checkOut: { gte: closeDate, lte: endOfDay },
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            },
            include: {
                guest: { select: { id: true, name: true, phone: true } },
                room: { select: { id: true, roomNumber: true, type: true } },
            },
            orderBy: { checkOut: 'asc' },
        }),
        // Actually checked-in today
        prisma.booking.findMany({
            where: {
                propertyId,
                checkInTime: { gte: closeDate, lte: endOfDay },
                status: 'CHECKED_IN',
            },
            include: {
                guest: { select: { id: true, name: true, phone: true } },
                room: { select: { id: true, roomNumber: true, type: true } },
            },
        }),
        // Payments received today
        prisma.payment.findMany({
            where: {
                booking: { propertyId },
                createdAt: { gte: closeDate, lte: endOfDay },
                status: 'PAID',
            },
            include: {
                booking: {
                    include: {
                        guest: { select: { id: true, name: true, phone: true } },
                        room: { select: { id: true, roomNumber: true } },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        }),
        // Room charges posted today
        prisma.roomCharge.findMany({
            where: {
                propertyId,
                chargeDate: { gte: closeDate, lte: endOfDay },
            },
            include: {
                booking: {
                    include: {
                        guest: { select: { id: true, name: true } },
                        room: { select: { id: true, roomNumber: true } },
                    },
                },
            },
        }),
        // Discrepancies for this close
        prisma.auditDiscrepancy.findMany({
            where: { propertyId, dailyCloseId: closeRecord?.id ?? 'none' },
            include: {
                booking: {
                    include: {
                        guest: { select: { id: true, name: true } },
                        room: { select: { id: true, roomNumber: true } },
                    },
                },
            },
            orderBy: { severity: 'desc' },
        }),
    ]);

    // Calculate totals
    const totalPaymentsAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRoomCharges = roomCharges.reduce((sum, rc) => sum + Number(rc.totalAmount), 0);

    // Room statistics
    const roomStats = await prisma.room.groupBy({
        by: ['status'],
        where: { propertyId },
        _count: { id: true },
    });

    const occupiedCount = roomStats.find(r => r.status === 'OCCUPIED')?._count.id ?? 0;
    const vacantCount = roomStats.find(r => r.status === 'VACANT')?._count.id ?? 0;
    const maintenanceCount = roomStats.find(r => r.status === 'MAINTENANCE')?._count.id ?? 0;
    const totalRooms = await prisma.room.count({ where: { propertyId } });

    return {
        date: closeDate.toISOString().split('T')[0],
        isClosed: !!closeRecord,
        closeRecord,
        summary: {
            totalRooms,
            occupiedRooms: occupiedCount,
            vacantRooms: vacantCount,
            maintenanceRooms: maintenanceCount,
            occupancyRate: totalRooms > 0 ? ((occupiedCount / totalRooms) * 100).toFixed(1) : '0',
            expectedCheckIns: checkIns.length,
            actualCheckIns: checkedInBookings.length,
            expectedCheckOuts: checkOuts.length,
            totalPayments: payments.length,
            totalPaymentsAmount,
            totalRoomCharges,
            discrepanciesFound: discrepancies.length,
        },
        checkIns,
        checkOuts,
        checkedInBookings,
        payments,
        roomCharges,
        discrepancies,
        roomStats: {
            byStatus: roomStats.reduce((acc, r) => ({ ...acc, [r.status]: r._count.id }), {}),
        },
    };
}

/**
 * Post room charges for occupied rooms on a specific date
 */
export async function postRoomCharges(
    propertyId: string,
    chargeDate: Date,
    postedById: string,
    dailyCloseId?: string
) {
    const date = new Date(chargeDate);
    date.setHours(0, 0, 0, 0);

    // Get all checked-in bookings that should have room charges posted
    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            status: 'CHECKED_IN',
            checkIn: { lte: date },
            checkOut: { gt: date },
        },
        include: {
            room: true,
            guest: true,
        },
    });

    const hotelSettings = await prisma.hotelSettings.findUnique({ where: { id: propertyId === 'default' ? 'default' : propertyId } });
    const extraGuestRateDaily = hotelSettings?.extraGuestRateDaily?.toNumber() ?? 500;

    const results = [];
    for (const booking of bookings) {
        // Check if charge already exists for this date
        const existingCharge = await prisma.roomCharge.findFirst({
            where: { bookingId: booking.id, chargeDate: date },
        });

        if (existingCharge) {
            results.push({ bookingId: booking.id, status: 'SKIPPED', reason: 'Already charged' });
            continue;
        }

        // Calculate room charge
        const isDouble = booking.guestsCount > 1;
        const baseRate = isDouble ? booking.room.basePriceDouble : booking.room.basePriceSingle;
        const extraGuests = Math.max(0, booking.guestsCount - 1);
        const extraGuestCharge = new Prisma.Decimal(extraGuestRateDaily * extraGuests);
        const subtotal = new Prisma.Decimal(baseRate.toNumber()).add(extraGuestCharge);
        const cgst = subtotal.mul(0.09); // 9% CGST
        const sgst = subtotal.mul(0.09); // 9% SGST
        const totalAmount = subtotal.add(cgst).add(sgst);

        const charge = await prisma.roomCharge.create({
            data: {
                bookingId: booking.id,
                propertyId,
                chargeDate: date,
                roomRate: baseRate,
                extraGuestCharge,
                subtotal,
                cgst,
                sgst,
                totalAmount,
                postedById,
                dailyCloseId,
            },
        });

        results.push({ bookingId: booking.id, status: 'CREATED', chargeId: charge.id });
    }

    return results;
}

/**
 * Create a discrepancy record
 */
export async function createDiscrepancy(
    propertyId: string,
    dailyCloseId: string | null,
    type: 'PAYMENT_MISMATCH' | 'CHARGE_MISSING' | 'DUPLICATE_PAYMENT' | 'UNVERIFIED_TRANSACTION' | 'ROOM_STATUS_MISMATCH' | 'PRICING_ERROR' | 'DOCUMENT_PENDING' | 'OVERBOOKING',
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    description: string,
    bookingId?: string,
    paymentId?: string
) {
    return prisma.auditDiscrepancy.create({
        data: {
            propertyId,
            dailyCloseId,
            type,
            severity,
            description,
            bookingId,
            paymentId,
        },
    });
}

/**
 * Get discrepancies for a property
 */
export async function getDiscrepancies(propertyId: string, startDate: Date, endDate: Date, unresolvedOnly = false) {
    const closeRecords = await prisma.propertyDailyClose.findMany({
        where: { propertyId, closeDate: { gte: startDate, lte: endDate } },
        select: { id: true },
    });
    const closeIds = closeRecords.map(c => c.id);

    return prisma.auditDiscrepancy.findMany({
        where: {
            propertyId,
            ...(unresolvedOnly ? { resolved: false } : {}),
            ...(closeIds.length > 0 ? { dailyCloseId: { in: closeIds } } : {}),
        },
        include: {
            booking: {
                include: {
                    guest: { select: { id: true, name: true, phone: true } },
                    room: { select: { id: true, roomNumber: true } },
                },
            },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
}

/**
 * Resolve a discrepancy
 */
export async function resolveDiscrepancy(
    id: string,
    resolvedById: string,
    resolutionNotes: string
) {
    return prisma.auditDiscrepancy.update({
        where: { id },
        data: {
            resolved: true,
            resolvedAt: new Date(),
            resolvedById,
            resolutionNotes,
        },
    });
}

/**
 * Update daily close record with room charges info
 */
export async function updateDailyCloseWithCharges(
    id: string,
    roomChargesPosted: boolean,
    roomChargesAmount: number
) {
    return prisma.propertyDailyClose.update({
        where: { id },
        data: {
            roomChargesPosted,
            roomChargesAmount: new Prisma.Decimal(roomChargesAmount),
        },
    });
}

/**
 * Verify payments against invoices for a date range
 */
export async function verifyPayments(propertyId: string, startDate: Date, endDate: Date) {
    const payments = await prisma.payment.findMany({
        where: {
            booking: { propertyId },
            createdAt: { gte: startDate, lte: endDate },
            status: 'PAID',
        },
        include: {
            booking: {
                include: {
                    guest: { select: { id: true, name: true } },
                    room: { select: { id: true, roomNumber: true } },
                    invoice: true,
                },
            },
        },
    });

    const discrepancies = [];

    for (const payment of payments) {
        // Check if payment has a linked invoice
        if (!payment.invoice) {
            discrepancies.push({
                paymentId: payment.id,
                type: 'UNVERIFIED_TRANSACTION' as const,
                severity: 'MEDIUM' as const,
                description: `Payment of ₹${payment.amount} for booking ${payment.booking.bookingNumber} has no invoice`,
                bookingId: payment.bookingId,
            });
        }

        // Check for duplicate payments (same transaction ID)
        if (payment.transactionId) {
            const duplicates = payments.filter(
                p => p.transactionId === payment.transactionId && p.id !== payment.id
            );
            if (duplicates.length > 0) {
                discrepancies.push({
                    paymentId: payment.id,
                    type: 'DUPLICATE_PAYMENT' as const,
                    severity: 'HIGH' as const,
                    description: `Duplicate payment detected with transaction ID ${payment.transactionId}`,
                    bookingId: payment.bookingId,
                });
            }
        }
    }

    return { payments, discrepancies };
}
