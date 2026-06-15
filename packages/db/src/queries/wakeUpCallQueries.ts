// packages/db/src/queries/wakeUpCallQueries.ts
// Query helpers for WakeUpCall model

import prisma from '../index';
import { Prisma, WakeUpCallStatus } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateWakeUpCallData = {
    bookingId?: string;
    roomNumber: string;
    guestName: string;
    phoneNumber?: string;
    scheduledTime: Date;
    duration?: number; // Duration in seconds
    notes?: string;
};

export type UpdateWakeUpCallData = {
    scheduledTime?: Date;
    duration?: number;
    status?: WakeUpCallStatus;
    notes?: string;
};

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Schedule a new wake-up call
 */
export async function createWakeUpCall(data: CreateWakeUpCallData) {
    return prisma.wakeUpCall.create({
        data: {
            bookingId: data.bookingId,
            roomNumber: data.roomNumber,
            guestName: data.guestName,
            phoneNumber: data.phoneNumber,
            scheduledTime: data.scheduledTime,
            duration: data.duration ?? 60, // Default 60 seconds
            status: 'PENDING',
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
 * Get wake-up call by ID
 */
export async function getWakeUpCallById(id: string) {
    return prisma.wakeUpCall.findUnique({
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
 * Get wake-up calls with filters
 */
export async function getWakeUpCalls(options: {
    status?: WakeUpCallStatus;
    bookingId?: string;
    roomNumber?: string;
    date?: Date; // Filter by date (will get all calls for that day)
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
}) {
    const { status, bookingId, roomNumber, date, startDate, endDate, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where: Prisma.WakeUpCallWhereInput = {};

    if (status) where.status = status;
    if (bookingId) where.bookingId = bookingId;
    if (roomNumber) where.roomNumber = roomNumber;

    // Date filter - get all calls for a specific day
    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        where.scheduledTime = {
            gte: startOfDay,
            lte: endOfDay,
        };
    } else if (startDate || endDate) {
        where.scheduledTime = {};
        if (startDate) where.scheduledTime.gte = startDate;
        if (endDate) where.scheduledTime.lte = endDate;
    }

    const [calls, total] = await Promise.all([
        prisma.wakeUpCall.findMany({
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
            orderBy: { scheduledTime: 'asc' },
            skip,
            take: pageSize,
        }),
        prisma.wakeUpCall.count({ where }),
    ]);

    return {
        calls,
        pagination: {
            page,
            pageSize,
            total,
            pages: Math.ceil(total / pageSize),
        },
    };
}

/**
 * Get pending wake-up calls for a specific time range (for operators)
 */
export async function getPendingWakeUpCallsForTimeRange(minutesAhead: number = 30) {
    const now = new Date();
    const future = new Date(now.getTime() + minutesAhead * 60 * 1000);

    return prisma.wakeUpCall.findMany({
        where: {
            status: 'PENDING',
            scheduledTime: {
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
        orderBy: { scheduledTime: 'asc' },
    });
}

/**
 * Get today's wake-up calls
 */
export async function getTodaysWakeUpCalls() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.wakeUpCall.findMany({
        where: {
            scheduledTime: {
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
        orderBy: { scheduledTime: 'asc' },
    });
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update a wake-up call
 */
export async function updateWakeUpCall(id: string, data: UpdateWakeUpCallData) {
    const updateData: Prisma.WakeUpCallUpdateInput = {};

    if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return prisma.wakeUpCall.update({
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
 * Mark wake-up call as completed
 */
export async function completeWakeUpCall(id: string) {
    return prisma.wakeUpCall.update({
        where: { id },
        data: {
            status: 'COMPLETED',
        },
    });
}

/**
 * Mark wake-up call as missed (auto-called by system if not completed within duration)
 */
export async function missWakeUpCall(id: string) {
    return prisma.wakeUpCall.update({
        where: { id },
        data: {
            status: 'MISSED',
        },
    });
}

/**
 * Cancel a wake-up call
 */
export async function cancelWakeUpCall(id: string) {
    return prisma.wakeUpCall.update({
        where: { id },
        data: {
            status: 'CANCELLED',
        },
    });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Delete a wake-up call
 */
export async function deleteWakeUpCall(id: string) {
    return prisma.wakeUpCall.delete({
        where: { id },
    });
}

// ─── Statistics ─────────────────────────────────────────────────────────────

/**
 * Get wake-up call statistics
 */
export async function getWakeUpCallStats(date?: Date) {
    const where: Prisma.WakeUpCallWhereInput = {};

    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        where.scheduledTime = {
            gte: startOfDay,
            lte: endOfDay,
        };
    }

    const [total, pending, completed, missed, cancelled] = await Promise.all([
        prisma.wakeUpCall.count({ where }),
        prisma.wakeUpCall.count({ where: { ...where, status: 'PENDING' } }),
        prisma.wakeUpCall.count({ where: { ...where, status: 'COMPLETED' } }),
        prisma.wakeUpCall.count({ where: { ...where, status: 'MISSED' } }),
        prisma.wakeUpCall.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    return {
        total,
        pending,
        completed,
        missed,
        cancelled,
    };
}
