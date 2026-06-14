import prisma from '../index';
import { FolioType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * ─── Folio Queries ─────────────────────────────────────────────────────────
 *
 * Functions for managing folios (multi-folio billing support)
 */

// ─── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new folio for a booking
 */
export async function createFolio(bookingId: string, data: {
    type?: FolioType;
    companyName?: string;
    companyGstin?: string;
    description?: string;
}) {
    const { type = 'GUEST', companyName, companyGstin, description } = data;

    // Generate folio number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `FOL-${dateStr}-`;

    const lastFolio = await prisma.folio.findFirst({
        where: { folioNumber: { startsWith: prefix } },
        orderBy: { folioNumber: 'desc' },
        select: { folioNumber: true },
    });

    let counter = 1;
    if (lastFolio) {
        const lastCounter = parseInt(lastFolio.folioNumber.split('-').pop() ?? '0', 10);
        counter = lastCounter + 1;
    }

    const folioNumber = `${prefix}${String(counter).padStart(4, '0')}`;

    return prisma.folio.create({
        data: {
            folioNumber,
            bookingId,
            type,
            companyName,
            companyGstin,
            description,
        },
        include: {
            booking: {
                select: { id: true, bookingNumber: true, guest: { select: { name: true } } },
            },
            charges: true,
            payments: {
                include: { payment: true },
            },
        },
    });
}

/**
 * Add a charge to a folio
 */
export async function addFolioCharge(folioId: string, data: {
    type: string;
    description: string;
    amount: Decimal | number;
    quantity?: number;
    chargeDate?: Date;
    cgst?: Decimal | number;
    sgst?: Decimal | number;
    addonId?: string;
}) {
    const { type, description, amount, quantity = 1, chargeDate = new Date(), cgst = 0, sgst = 0, addonId } = data;

    const amountNum = typeof amount === 'number' ? amount : amount.toNumber();
    const cgstNum = typeof cgst === 'number' ? cgst : cgst.toNumber();
    const sgstNum = typeof sgst === 'number' ? sgst : sgst.toNumber();
    const totalAmount = amountNum * quantity + cgstNum + sgstNum;

    return prisma.folioCharge.create({
        data: {
            folioId,
            type: type as any,
            description,
            amount: new Decimal(amountNum.toString()),
            quantity,
            chargeDate,
            cgst: new Decimal(cgstNum.toString()),
            sgst: new Decimal(sgstNum.toString()),
            totalAmount: new Decimal(totalAmount.toString()),
            addonId,
        },
    });
}

/**
 * Allocate a payment to a folio
 */
export async function allocatePaymentToFolio(
    folioId: string,
    paymentId: string,
    amount: Decimal | number
) {
    const amountNum = typeof amount === 'number' ? amount : amount.toNumber();

    return prisma.folioPayment.create({
        data: {
            folioId,
            paymentId,
            amount: new Decimal(amountNum.toString()),
        },
    });
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Get folio by ID
 */
export async function getFolioById(id: string) {
    return prisma.folio.findUnique({
        where: { id },
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: { select: { name: true } },
                    totalAmount: true,
                },
            },
            charges: { orderBy: { chargeDate: 'desc' } },
            payments: {
                include: { payment: true },
            },
        },
    });
}

/**
 * Get folio by booking
 */
export async function getFolioByBooking(bookingId: string) {
    return prisma.folio.findFirst({
        where: { bookingId },
        include: {
            charges: true,
            payments: {
                include: { payment: true },
            },
        },
    });
}

/**
 * Get all folios for a booking
 */
export async function getBookingsFolio(bookingId: string) {
    return prisma.folio.findMany({
        where: { bookingId },
        include: {
            charges: true,
            payments: {
                include: { payment: true },
            },
        },
        orderBy: { createdAt: 'asc' },
    });
}

/**
 * Calculate folio balance
 */
export async function getFolioBalance(folioId: string) {
    const folio = await prisma.folio.findUnique({
        where: { id: folioId },
        include: {
            charges: true,
            payments: {
                include: { payment: { where: { status: 'PAID' } } },
            },
        },
    });

    if (!folio) throw new Error('Folio not found');

    const totalCharges = folio.charges.reduce(
        (sum, c) => sum + c.totalAmount.toNumber(),
        0
    );

    const totalPayments = folio.payments.reduce(
        (sum, p) => sum + p.amount.toNumber(),
        0
    );

    return {
        totalCharges,
        totalPayments,
        balance: totalCharges - totalPayments,
        isPaid: totalPayments >= totalCharges,
    };
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Close a folio
 */
export async function closeFolio(id: string) {
    return prisma.folio.update({
        where: { id },
        data: {
            isClosed: true,
            closedAt: new Date(),
        },
    });
}

/**
 * Reopen a closed folio (admin only)
 */
export async function reopenFolio(id: string) {
    return prisma.folio.update({
        where: { id },
        data: {
            isClosed: false,
            closedAt: null,
        },
    });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Delete a folio charge
 */
export async function deleteFolioCharge(id: string) {
    return prisma.folioCharge.delete({
        where: { id },
    });
}
