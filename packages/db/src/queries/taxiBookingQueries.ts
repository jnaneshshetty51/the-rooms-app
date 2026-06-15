// packages/db/src/queries/taxiBookingQueries.ts
// Query helpers for TaxiBooking model

import prisma from '../index';
import { Prisma, TaxiBookingStatus, VehicleType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateTaxiBookingData = {
    bookingId?: string;
    roomNumber: string;
    guestName: string;
    phoneNumber: string;
    pickupLocation: string;
    dropoffLocation: string;
    pickupDateTime: Date;
    vehicleType: VehicleType;
    numberOfPassengers?: number;
    fare?: number;
    notes?: string;
};

export type UpdateTaxiBookingData = {
    pickupLocation?: string;
    dropoffLocation?: string;
    pickupDateTime?: Date;
    vehicleType?: VehicleType;
    numberOfPassengers?: number;
    driverName?: string;
    driverPhone?: string;
    vehicleNumber?: string;
    fare?: number;
    status?: TaxiBookingStatus;
    notes?: string;
};

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new taxi booking
 */
export async function createTaxiBooking(data: CreateTaxiBookingData) {
    return prisma.taxiBooking.create({
        data: {
            bookingId: data.bookingId,
            roomNumber: data.roomNumber,
            guestName: data.guestName,
            phoneNumber: data.phoneNumber,
            pickupLocation: data.pickupLocation,
            dropoffLocation: data.dropoffLocation,
            pickupDateTime: data.pickupDateTime,
            vehicleType: data.vehicleType,
            numberOfPassengers: data.numberOfPassengers ?? 1,
            fare: data.fare !== undefined ? new Decimal(data.fare) : undefined,
            status: 'REQUESTED',
            notes: data.notes,
        },
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true, phone: true } },
                },
            },
        },
    });
}

// ─── Read ───────────────────────────────────────────────────────────────────

/**
 * Get taxi booking by ID
 */
export async function getTaxiBookingById(id: string) {
    return prisma.taxiBooking.findUnique({
        where: { id },
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true, phone: true } },
                    room: { select: { roomNumber: true } },
                },
            },
        },
    });
}

/**
 * Get taxi bookings with filters
 */
export async function getTaxiBookings(options: {
    status?: TaxiBookingStatus;
    bookingId?: string;
    roomNumber?: string;
    date?: Date; // Filter by date (will get all bookings for that day)
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
}) {
    const { status, bookingId, roomNumber, date, startDate, endDate, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TaxiBookingWhereInput = {};

    if (status) where.status = status;
    if (bookingId) where.bookingId = bookingId;
    if (roomNumber) where.roomNumber = roomNumber;

    // Date filter - get all bookings for a specific day
    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        where.pickupDateTime = {
            gte: startOfDay,
            lte: endOfDay,
        };
    } else if (startDate || endDate) {
        where.pickupDateTime = {};
        if (startDate) where.pickupDateTime.gte = startDate;
        if (endDate) where.pickupDateTime.lte = endDate;
    }

    const [bookings, total] = await Promise.all([
        prisma.taxiBooking.findMany({
            where,
            include: {
                booking: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        guest: { select: { name: true } },
                    },
                },
            },
            orderBy: { pickupDateTime: 'asc' },
            skip,
            take: pageSize,
        }),
        prisma.taxiBooking.count({ where }),
    ]);

    return {
        bookings,
        pagination: {
            page,
            pageSize,
            total,
            pages: Math.ceil(total / pageSize),
        },
    };
}

/**
 * Get upcoming taxi bookings (for dispatch)
 */
export async function getUpcomingTaxiBookings(minutesAhead: number = 60) {
    const now = new Date();
    const future = new Date(now.getTime() + minutesAhead * 60 * 1000);

    return prisma.taxiBooking.findMany({
        where: {
            status: { in: ['REQUESTED', 'CONFIRMED'] },
            pickupDateTime: {
                gte: now,
                lte: future,
            },
        },
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true, phone: true } },
                },
            },
        },
        orderBy: { pickupDateTime: 'asc' },
    });
}

/**
 * Get today's taxi bookings
 */
export async function getTodaysTaxiBookings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.taxiBooking.findMany({
        where: {
            pickupDateTime: {
                gte: today,
                lt: tomorrow,
            },
        },
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true } },
                },
            },
        },
        orderBy: { pickupDateTime: 'asc' },
    });
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update a taxi booking
 */
export async function updateTaxiBooking(id: string, data: UpdateTaxiBookingData) {
    const updateData: Prisma.TaxiBookingUpdateInput = {};

    if (data.pickupLocation !== undefined) updateData.pickupLocation = data.pickupLocation;
    if (data.dropoffLocation !== undefined) updateData.dropoffLocation = data.dropoffLocation;
    if (data.pickupDateTime !== undefined) updateData.pickupDateTime = data.pickupDateTime;
    if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType;
    if (data.numberOfPassengers !== undefined) updateData.numberOfPassengers = data.numberOfPassengers;
    if (data.driverName !== undefined) updateData.driverName = data.driverName;
    if (data.driverPhone !== undefined) updateData.driverPhone = data.driverPhone;
    if (data.vehicleNumber !== undefined) updateData.vehicleNumber = data.vehicleNumber;
    if (data.fare !== undefined) updateData.fare = new Decimal(data.fare);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return prisma.taxiBooking.update({
        where: { id },
        data: updateData,
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true } },
                },
            },
        },
    });
}

/**
 * Confirm a taxi booking (assign driver)
 */
export async function confirmTaxiBooking(
    id: string,
    driverInfo: {
        driverName: string;
        driverPhone: string;
        vehicleNumber: string;
        fare?: number;
    }
) {
    return prisma.taxiBooking.update({
        where: { id },
        data: {
            status: 'CONFIRMED',
            driverName: driverInfo.driverName,
            driverPhone: driverInfo.driverPhone,
            vehicleNumber: driverInfo.vehicleNumber,
            fare: driverInfo.fare !== undefined ? new Decimal(driverInfo.fare) : undefined,
        },
    });
}

/**
 * Start taxi trip (in progress)
 */
export async function startTaxiTrip(id: string) {
    return prisma.taxiBooking.update({
        where: { id },
        data: {
            status: 'IN_PROGRESS',
        },
    });
}

/**
 * Complete taxi trip
 */
export async function completeTaxiTrip(id: string) {
    return prisma.taxiBooking.update({
        where: { id },
        data: {
            status: 'COMPLETED',
        },
    });
}

/**
 * Cancel taxi booking
 */
export async function cancelTaxiBooking(id: string, reason?: string) {
    return prisma.taxiBooking.update({
        where: { id },
        data: {
            status: 'CANCELLED',
            notes: reason,
        },
    });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Delete a taxi booking (admin only - should not be used for active bookings)
 */
export async function deleteTaxiBooking(id: string) {
    return prisma.taxiBooking.delete({
        where: { id },
    });
}

// ─── Statistics ─────────────────────────────────────────────────────────────

/**
 * Get taxi booking statistics
 */
export async function getTaxiBookingStats(date?: Date) {
    const where: Prisma.TaxiBookingWhereInput = {};

    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        where.pickupDateTime = {
            gte: startOfDay,
            lte: endOfDay,
        };
    }

    const [total, requested, confirmed, inProgress, completed, cancelled] = await Promise.all([
        prisma.taxiBooking.count({ where }),
        prisma.taxiBooking.count({ where: { ...where, status: 'REQUESTED' } }),
        prisma.taxiBooking.count({ where: { ...where, status: 'CONFIRMED' } }),
        prisma.taxiBooking.count({ where: { ...where, status: 'IN_PROGRESS' } }),
        prisma.taxiBooking.count({ where: { ...where, status: 'COMPLETED' } }),
        prisma.taxiBooking.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    // Calculate total fare collected
    const fareResult = await prisma.taxiBooking.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { fare: true },
    });

    return {
        total,
        requested,
        confirmed,
        inProgress,
        completed,
        cancelled,
        totalFareCollected: fareResult._sum.fare?.toNumber() ?? 0,
    };
}
