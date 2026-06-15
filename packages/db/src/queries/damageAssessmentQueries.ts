// packages/db/src/queries/damageAssessmentQueries.ts
// Query helpers for DamageAssessment model

import prisma from '../index';
import { Prisma, DamageType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateDamageAssessmentData = {
    bookingId: string;
    roomId: string;
    description: string;
    damageType: DamageType;
    amount: number;
    images?: string[];
    assessedById: string;
};

export type UpdateDamageAssessmentData = {
    description?: string;
    damageType?: DamageType;
    amount?: number;
    images?: string[];
};

export type ApproveDamageChargeData = {
    approvedById: string;
    notes?: string;
};

// ─── Create Damage Assessment ─────────────────────────────────────────────────

/**
 * Create a new damage assessment record
 */
export async function createDamageAssessment(data: CreateDamageAssessmentData) {
    const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    const room = await prisma.room.findUnique({
        where: { id: data.roomId },
    });

    if (!room) {
        throw new Error('Room not found');
    }

    return prisma.damageAssessment.create({
        data: {
            bookingId: data.bookingId,
            roomId: data.roomId,
            description: data.description,
            damageType: data.damageType,
            amount: new Decimal(data.amount),
            images: data.images || [],
            assessedById: data.assessedById,
        },
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true, phone: true } },
                },
            },
            room: {
                select: {
                    id: true,
                    roomNumber: true,
                },
            },
            assessedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

// ─── Update Damage Assessment ────────────────────────────────────────────────

/**
 * Update a damage assessment record
 */
export async function updateDamageAssessment(
    id: string,
    data: UpdateDamageAssessmentData
) {
    const assessment = await prisma.damageAssessment.findUnique({
        where: { id },
    });

    if (!assessment) {
        throw new Error('Damage assessment not found');
    }

    const updateData: Prisma.DamageAssessmentUpdateInput = {};

    if (data.description !== undefined) updateData.description = data.description;
    if (data.damageType !== undefined) updateData.damageType = data.damageType;
    if (data.amount !== undefined) updateData.amount = new Decimal(data.amount);
    if (data.images !== undefined) updateData.images = data.images;

    return prisma.damageAssessment.update({
        where: { id },
        data: updateData,
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true, phone: true } },
                },
            },
            room: {
                select: {
                    id: true,
                    roomNumber: true,
                },
            },
            assessedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

// ─── Get Damage Assessments By Booking ───────────────────────────────────────

/**
 * Get all damage assessments for a booking
 */
export async function getDamageAssessmentsByBooking(bookingId: string) {
    return prisma.damageAssessment.findMany({
        where: { bookingId },
        include: {
            room: {
                select: {
                    id: true,
                    roomNumber: true,
                },
            },
            assessedBy: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { assessedAt: 'desc' },
    });
}

// ─── Get Damage Assessments By Room ──────────────────────────────────────────

/**
 * Get all damage assessments for a room
 */
export async function getDamageAssessmentsByRoom(roomId: string) {
    return prisma.damageAssessment.findMany({
        where: { roomId },
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true, phone: true } },
                },
            },
            assessedBy: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { assessedAt: 'desc' },
    });
}

// ─── Get Damage Assessment By ID ─────────────────────────────────────────────

/**
 * Get a single damage assessment by ID
 */
export async function getDamageAssessmentById(id: string) {
    return prisma.damageAssessment.findUnique({
        where: { id },
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true, phone: true } },
                },
            },
            room: {
                select: {
                    id: true,
                    roomNumber: true,
                },
            },
            assessedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

// ─── Approve Damage Charge ───────────────────────────────────────────────────

/**
 * Approve a damage charge and add it to the booking's folio
 */
export async function approveDamageCharge(
    id: string,
    data: ApproveDamageChargeData
) {
    const assessment = await prisma.damageAssessment.findUnique({
        where: { id },
        include: {
            booking: {
                include: {
                    folio: true,
                },
            },
        },
    });

    if (!assessment) {
        throw new Error('Damage assessment not found');
    }

    // Get or create folio for the booking
    let folio = assessment.booking.folio;
    if (!folio) {
        folio = await prisma.folio.create({
            data: {
                folioNumber: `FOL-${Date.now()}`,
                bookingId: assessment.bookingId,
                type: 'GUEST',
            },
        });
    }

    // Calculate tax (assuming 18% GST)
    const amount = assessment.amount.toNumber();
    const cgst = amount * 0.09;
    const sgst = amount * 0.09;
    const totalAmount = amount + cgst + sgst;

    // Create folio charge
    const charge = await prisma.folioCharge.create({
        data: {
            folioId: folio.id,
            type: 'DAMAGE',
            description: `Damage charge: ${assessment.description}`,
            amount: assessment.amount,
            cgst: new Decimal(cgst),
            sgst: new Decimal(sgst),
            totalAmount: new Decimal(totalAmount),
            chargeDate: new Date(),
        },
    });

    // Update booking's damage charges total
    const currentDamageTotal = assessment.booking.damageChargesTotal?.toNumber() || 0;
    await prisma.booking.update({
        where: { id: assessment.bookingId },
        data: {
            damageChargesTotal: new Decimal(currentDamageTotal + totalAmount),
        },
    });

    return {
        assessment,
        charge: {
            id: charge.id,
            amount: charge.amount,
            cgst: charge.cgst,
            sgst: charge.sgst,
            totalAmount: charge.totalAmount,
        },
    };
}

// ─── Delete Damage Assessment ─────────────────────────────────────────────────

/**
 * Delete a damage assessment (admin only)
 */
export async function deleteDamageAssessment(id: string) {
    const assessment = await prisma.damageAssessment.findUnique({
        where: { id },
    });

    if (!assessment) {
        throw new Error('Damage assessment not found');
    }

    return prisma.damageAssessment.delete({
        where: { id },
    });
}

// ─── Get All Damage Assessments (with filters) ────────────────────────────────

/**
 * Get all damage assessments with optional filters
 */
export async function getAllDamageAssessments(options: {
    bookingId?: string;
    roomId?: string;
    damageType?: DamageType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
}) {
    const { bookingId, roomId, damageType, startDate, endDate, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where: Prisma.DamageAssessmentWhereInput = {};

    if (bookingId) where.bookingId = bookingId;
    if (roomId) where.roomId = roomId;
    if (damageType) where.damageType = damageType;

    if (startDate || endDate) {
        where.assessedAt = {};
        if (startDate) where.assessedAt.gte = startDate;
        if (endDate) where.assessedAt.lte = endDate;
    }

    const [assessments, total] = await Promise.all([
        prisma.damageAssessment.findMany({
            where,
            include: {
                booking: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        guest: { select: { name: true, phone: true } },
                    },
                },
                room: {
                    select: {
                        id: true,
                        roomNumber: true,
                    },
                },
                assessedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { assessedAt: 'desc' },
            skip,
            take: pageSize,
        }),
        prisma.damageAssessment.count({ where }),
    ]);

    return {
        assessments,
        pagination: {
            page,
            pageSize,
            total,
            pages: Math.ceil(total / pageSize),
        },
    };
}
