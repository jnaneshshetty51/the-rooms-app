// packages/db/src/queries/receiptQueries.ts
// Receipt generation and management queries
// One payment = one receipt (immutable financial document)

import prisma from '../index';
import { Prisma, ReceiptStatus, ReceiptPaymentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CreateReceiptData = {
    paymentId: string;
    invoiceId?: string;
    amount: Prisma.Decimal;
    paymentType?: ReceiptPaymentType;
    remainingBalance?: Prisma.Decimal;
    collectedById?: string;
};

// ─── Receipt Number Generation ───────────────────────────────────────────────
/**
 * Generate receipt number in format: RCPT-YYYYMMDD-XXXX
 * Uses database-level locking to prevent race conditions and gaps
 */
export async function generateReceiptNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const result = await prisma.$transaction(async (tx) => {
        const latestReceipt = await tx.receipt.findFirst({
            where: {
                receiptNumber: {
                    startsWith: `RCPT-${dateStr}`,
                },
            },
            orderBy: { receiptNumber: 'desc' },
            select: { receiptNumber: true },
        });

        let sequence = 1;
        if (latestReceipt) {
            const lastSequence = parseInt(latestReceipt.receiptNumber.split('-')[2], 10);
            sequence = lastSequence + 1;
        }

        const sequenceStr = String(sequence).padStart(4, '0');
        return `RCPT-${dateStr}-${sequenceStr}`;
    });

    return result;
}

// ─── Number to Words Conversion ─────────────────────────────────────────────
/**
 * Convert number to words (Indian format)
 * e.g., 2500 -> "Rupees Two Thousand Five Hundred Only"
 */
export function numberToWords(num: number): string {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertHundreds(n: number): string {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundreds(n % 100) : '');
    }

    const lakhs = Math.floor(num / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const rest = num % 1000;

    let result = '';
    if (lakhs > 0) result += convertHundreds(lakhs) + ' Lakh' + (thousands > 0 ? ' ' : '');
    if (thousands > 0) result += convertHundreds(thousands) + ' Thousand' + (rest > 0 ? ' ' : '');
    if (rest > 0) result += convertHundreds(rest);

    return 'Rupees ' + result.trim() + ' Only';
}

// ─── Receipt Generation ──────────────────────────────────────────────────────
/**
 * Create a receipt for a payment
 * One payment = one receipt (immutable)
 */
export async function createReceipt(data: CreateReceiptData): Promise<{
    id: string;
    receiptNumber: string;
    amount: Prisma.Decimal;
    amountInWords: string;
    paymentType: ReceiptPaymentType;
    remainingBalance: Prisma.Decimal;
    pdfUrl: string | null;
    status: ReceiptStatus;
    createdAt: Date;
}> {
    // Check if receipt already exists for this payment
    const existingReceipt = await prisma.receipt.findUnique({
        where: { paymentId: data.paymentId },
    });

    if (existingReceipt) {
        throw new Error(`Receipt already exists for payment: ${existingReceipt.receiptNumber}`);
    }

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber();

    // Convert amount to words
    const amountInWords = numberToWords(Math.round(data.amount.toNumber()));

    // Create receipt
    const receipt = await prisma.receipt.create({
        data: {
            paymentId: data.paymentId,
            invoiceId: data.invoiceId,
            receiptNumber,
            amount: data.amount,
            amountInWords,
            paymentType: data.paymentType ?? 'FULL',
            remainingBalance: data.remainingBalance ?? new Decimal(0),
            collectedById: data.collectedById,
            status: 'ACTIVE',
        },
    });

    return {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        amount: receipt.amount,
        amountInWords: receipt.amountInWords ?? '',
        paymentType: receipt.paymentType,
        remainingBalance: receipt.remainingBalance,
        pdfUrl: receipt.pdfUrl,
        status: receipt.status,
        createdAt: receipt.createdAt,
    };
}

/**
 * Create a refund receipt
 */
export async function createRefundReceipt(
    originalPaymentId: string,
    refundAmount: Prisma.Decimal,
    collectedById?: string
): Promise<{
    id: string;
    receiptNumber: string;
    amount: Prisma.Decimal;
    amountInWords: string;
    paymentType: ReceiptPaymentType;
}> {
    // Get original payment to find the booking
    const originalPayment = await prisma.payment.findUnique({
        where: { id: originalPaymentId },
    });

    if (!originalPayment) {
        throw new Error('Original payment not found');
    }

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber();

    // Convert amount to words (negative for refund)
    const amountInWords = 'Rupees ' + numberToWords(Math.round(refundAmount.toNumber())) + ' Only (Refund)';

    const receipt = await prisma.receipt.create({
        data: {
            paymentId: originalPaymentId,
            receiptNumber,
            amount: refundAmount,
            amountInWords,
            paymentType: 'REFUND',
            remainingBalance: new Decimal(0),
            collectedById,
            status: 'ACTIVE',
        },
    });

    return {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        amount: receipt.amount,
        amountInWords: receipt.amountInWords ?? '',
        paymentType: receipt.paymentType,
        remainingBalance: receipt.remainingBalance,
    };
}

// ─── Receipt Retrieval ───────────────────────────────────────────────────────
/**
 * Get receipt by ID with all relations
 */
export async function getReceiptById(receiptId: string) {
    return prisma.receipt.findUnique({
        where: { id: receiptId },
        include: {
            payment: {
                include: {
                    booking: {
                        include: {
                            guest: true,
                            room: true,
                            property: true,
                        },
                    },
                },
            },
            invoice: {
                include: {
                    booking: {
                        include: {
                            guest: true,
                        },
                    },
                },
            },
            collectedBy: {
                select: { id: true, name: true, email: true },
            },
        },
    });
}

/**
 * Get receipt by payment ID
 */
export async function getReceiptByPaymentId(paymentId: string) {
    return prisma.receipt.findUnique({
        where: { paymentId },
        include: {
            payment: {
                include: {
                    booking: {
                        include: {
                            guest: { select: { name: true, phone: true } },
                            room: { select: { roomNumber: true } },
                        },
                    },
                },
            },
            invoice: true,
            collectedBy: {
                select: { name: true },
            },
        },
    });
}

/**
 * Get receipt by number
 */
export async function getReceiptByNumber(receiptNumber: string) {
    return prisma.receipt.findUnique({
        where: { receiptNumber },
        include: {
            payment: {
                include: {
                    booking: {
                        include: {
                            guest: true,
                            room: true,
                        },
                    },
                },
            },
            invoice: true,
            collectedBy: {
                select: { name: true },
            },
        },
    });
}

/**
 * Get all receipts with pagination
 */
export async function getReceipts(params: {
    page?: number;
    pageSize?: number;
    status?: ReceiptStatus;
    paymentType?: ReceiptPaymentType;
    dateFrom?: Date;
    dateTo?: Date;
    bookingId?: string;
}) {
    const { page = 1, pageSize = 20, status, paymentType, dateFrom, dateTo, bookingId } = params;

    const where: Prisma.ReceiptWhereInput = {};

    if (status) {
        where.status = status;
    }
    if (paymentType) {
        where.paymentType = paymentType;
    }
    if (bookingId) {
        where.payment = { bookingId };
    }
    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
            where.createdAt.gte = dateFrom;
        }
        if (dateTo) {
            where.createdAt.lte = dateTo;
        }
    }

    const [receipts, total] = await Promise.all([
        prisma.receipt.findMany({
            where,
            include: {
                payment: {
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
                },
                invoice: {
                    select: { invoiceNumber: true },
                },
                collectedBy: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.receipt.count({ where }),
    ]);

    return { receipts, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ─── Receipt Operations ──────────────────────────────────────────────────────
/**
 * Update receipt PDF URL after generation
 */
export async function updateReceiptPdfUrl(
    receiptId: string,
    pdfUrl: string
): Promise<void> {
    await prisma.receipt.update({
        where: { id: receiptId },
        data: { pdfUrl },
    });
}

/**
 * Cancel a receipt (admin only - for error correction)
 * Receipts should generally not be cancelled - refunds are preferred
 */
export async function cancelReceipt(
    receiptId: string,
    reason: string
): Promise<void> {
    const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId },
    });

    if (!receipt) {
        throw new Error('Receipt not found');
    }

    if (receipt.status === 'CANCELLED') {
        throw new Error('Receipt is already cancelled');
    }

    await prisma.receipt.update({
        where: { id: receiptId },
        data: {
            status: 'CANCELLED',
        },
    });

    // Note: We don't delete the receipt, just mark it as cancelled
    // The original payment record remains intact for audit trail
}

// ─── Receipt for Advance Payment ─────────────────────────────────────────────
/**
 * Create receipt for advance deposit
 */
export async function createAdvanceReceipt(
    paymentId: string,
    collectedById?: string
): Promise<{
    id: string;
    receiptNumber: string;
    amount: Prisma.Decimal;
    amountInWords: string;
}> {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: true },
    });

    if (!payment) {
        throw new Error('Payment not found');
    }

    const receiptNumber = await generateReceiptNumber();
    const amountInWords = numberToWords(Math.round(payment.amount.toNumber()));

    const receipt = await prisma.receipt.create({
        data: {
            paymentId,
            receiptNumber,
            amount: payment.amount,
            amountInWords,
            paymentType: 'ADVANCE',
            remainingBalance: payment.booking.totalAmount,
            collectedById,
            status: 'ACTIVE',
        },
    });

    return {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        amount: receipt.amount,
        amountInWords: receipt.amountInWords ?? '',
    };
}

// ─── Alias for backward compatibility ────────────────────────────────────────
export const generateReceipt = createReceipt;
