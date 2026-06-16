// packages/db/src/queries/lostAndFoundQueries.ts
// Query helpers for LostAndFound model

import prisma from '../index';
import { Prisma, LostAndFoundCategory, LostAndFoundStatus } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateLostAndFoundData = {
    bookingId?: string;
    roomNumber?: string;
    itemDescription: string;
    category: LostAndFoundCategory;
    color?: string;
    foundDate: Date;
    identifiedBy: string;
};

export type UpdateLostAndFoundData = {
    itemDescription?: string;
    category?: LostAndFoundCategory;
    color?: string;
    status?: LostAndFoundStatus;
    claimedDate?: Date;
    notes?: string;
};

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new lost and found item
 */
export async function createLostAndFoundItem(data: CreateLostAndFoundData) {
    return prisma.lostAndFound.create({
        data: {
            bookingId: data.bookingId,
            roomNumber: data.roomNumber,
            itemDescription: data.itemDescription,
            category: data.category,
            color: data.color,
            foundDate: data.foundDate,
            identifiedBy: data.identifiedBy,
            status: 'UNCLAIMED',
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
 * Get lost and found item by ID
 */
export async function getLostAndFoundById(id: string) {
    return prisma.lostAndFound.findUnique({
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
 * Get all lost and found items with filters
 */
export async function getLostAndFoundItems(options: {
    status?: LostAndFoundStatus;
    category?: LostAndFoundCategory;
    bookingId?: string;
    roomNumber?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
}) {
    const { status, category, bookingId, roomNumber, startDate, endDate, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where: Prisma.LostAndFoundWhereInput = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (bookingId) where.bookingId = bookingId;
    if (roomNumber) where.roomNumber = roomNumber;

    if (startDate || endDate) {
        where.foundDate = {};
        if (startDate) where.foundDate.gte = startDate;
        if (endDate) where.foundDate.lte = endDate;
    }

    const [items, total] = await Promise.all([
        prisma.lostAndFound.findMany({
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
            orderBy: { foundDate: 'desc' },
            skip,
            take: pageSize,
        }),
        prisma.lostAndFound.count({ where }),
    ]);

    return {
        items,
        pagination: {
            page,
            pageSize,
            total,
            pages: Math.ceil(total / pageSize),
        },
    };
}

/**
 * Get unclaimed items count by category
 */
export async function getUnclaimedCountByCategory() {
    const result = await prisma.lostAndFound.groupBy({
        by: ['category'],
        where: { status: 'UNCLAIMED' },
        _count: true,
    });

    return result.map(r => ({
        category: r.category,
        count: r._count,
    }));
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update a lost and found item
 */
export async function updateLostAndFoundItem(id: string, data: UpdateLostAndFoundData) {
    const updateData: Prisma.LostAndFoundUpdateInput = {};

    if (data.itemDescription !== undefined) updateData.itemDescription = data.itemDescription;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.claimedDate !== undefined) updateData.claimedDate = data.claimedDate;

    return prisma.lostAndFound.update({
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
 * Mark item as claimed
 */
export async function claimLostAndFoundItem(id: string, claimedDate: Date = new Date()) {
    return prisma.lostAndFound.update({
        where: { id },
        data: {
            status: 'CLAIMED',
            claimedDate,
        },
    });
}

/**
 * Mark item as returned to guest
 */
export async function returnToGuestLostAndFoundItem(id: string, returnedDate: Date = new Date()) {
    return prisma.lostAndFound.update({
        where: { id },
        data: {
            status: 'RETURNED_TO_GUEST',
            claimedDate: returnedDate,
        },
    });
}

/**
 * Mark item as disposed
 */
export async function disposeLostAndFoundItem(id: string) {
    return prisma.lostAndFound.update({
        where: { id },
        data: {
            status: 'DISPOSED',
        },
    });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Delete a lost and found item (admin only)
 */
export async function deleteLostAndFoundItem(id: string) {
    return prisma.lostAndFound.delete({
        where: { id },
    });
}

// ─── Statistics ─────────────────────────────────────────────────────────────

/**
 * Get lost and found statistics
 */
export async function getLostAndFoundStats(propertyId?: string) {
    const where: Prisma.LostAndFoundWhereInput = {};

    const [total, unclaimed, claimed, disposed, byCategory] = await Promise.all([
        prisma.lostAndFound.count({ where }),
        prisma.lostAndFound.count({ where: { ...where, status: 'UNCLAIMED' } }),
        prisma.lostAndFound.count({ where: { ...where, status: 'CLAIMED' } }),
        prisma.lostAndFound.count({ where: { ...where, status: 'DISPOSED' } }),
        prisma.lostAndFound.groupBy({
            by: ['category'],
            where,
            _count: true,
        }),
    ]);

    return {
        total,
        unclaimed,
        claimed,
        disposed,
        byCategory: byCategory.map(c => ({ category: c.category, count: c._count })),
    };
}
