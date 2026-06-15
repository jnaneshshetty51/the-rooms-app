// apps/front-office/src/app/api/receipts/route.ts
// Receipt generation and management API
// One payment = one receipt (immutable financial document)

import { NextRequest } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db, Prisma } from '@the-rooms/db';
import { ok, created, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import {
    createReceipt,
    createAdvanceReceipt,
    getReceipts,
    getReceiptByPaymentId,
} from '@the-rooms/db';

// ─── Generate Receipt ─────────────────────────────────────────────────────────
/**
 * POST /api/receipts/generate
 * Generate receipt for a payment
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest('Unauthorized');
        }

        const userRole = (session.user as { role?: string }).role;
        const userId = (session.user as { id?: string }).id;

        // Only FRONT_OFFICE, ADMIN, SUPER_ADMIN can generate receipts
        if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '')) {
            return badRequest('Insufficient permissions to generate receipts');
        }

        const body = await request.json();
        const { paymentId, invoiceId, amount, paymentType, remainingBalance } = body;

        if (!paymentId) {
            return badRequest('Payment ID is required');
        }

        // Check if payment exists
        const payment = await db.payment.findUnique({
            where: { id: paymentId },
            include: { booking: true },
        });

        if (!payment) {
            return badRequest('Payment not found');
        }

        // Check if receipt already exists for this payment
        const existingReceipt = await getReceiptByPaymentId(paymentId);
        if (existingReceipt) {
            return badRequest(`Receipt already exists: ${existingReceipt.receiptNumber}`);
        }

        // Determine payment type based on booking status
        let resolvedPaymentType = paymentType ?? 'FULL';
        if (payment.booking.paymentStatus === 'PENDING') {
            resolvedPaymentType = 'ADVANCE';
        } else if (payment.booking.paymentStatus === 'PARTIAL') {
            resolvedPaymentType = 'PARTIAL';
        }

        // Create receipt
        const receipt = await createReceipt({
            paymentId,
            invoiceId,
            amount: new Prisma.Decimal(amount ?? payment.amount.toString()),
            paymentType: resolvedPaymentType,
            remainingBalance: remainingBalance ? new Prisma.Decimal(remainingBalance) : new Prisma.Decimal(0),
            collectedById: userId,
        });

        // Create audit log
        await createAuditLog({
            userId,
            bookingId: payment.bookingId,
            action: 'CREATE',
            entity: 'receipt',
            entityId: receipt.id,
            metadata: {
                receiptNumber: receipt.receiptNumber,
                amount: receipt.amount.toString(),
                paymentType: receipt.paymentType,
            },
            ipAddress: getClientIp(request),
        });

        return created({
            receipt: {
                id: receipt.id,
                receiptNumber: receipt.receiptNumber,
                amount: receipt.amount.toString(),
                amountInWords: receipt.amountInWords,
                paymentType: receipt.paymentType,
                remainingBalance: receipt.remainingBalance.toString(),
                status: receipt.status,
                createdAt: receipt.createdAt,
            },
        });
    } catch (error) {
        console.error('Error generating receipt:', error);
        if (error instanceof Error && error.message.includes('already exists')) {
            return badRequest(error.message);
        }
        return serverError('Failed to generate receipt');
    }
}

// ─── List Receipts ─────────────────────────────────────────────────────────────
/**
 * GET /api/receipts
 * List all receipts with pagination and filters
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest('Unauthorized');
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') ?? '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
        const status = searchParams.get('status') as 'ACTIVE' | 'CANCELLED' | null;
        const paymentType = searchParams.get('paymentType') as 'ADVANCE' | 'PARTIAL' | 'FULL' | 'REFUND' | null;
        const dateFrom = searchParams.get('from');
        const dateTo = searchParams.get('to');
        const bookingId = searchParams.get('bookingId');

        const result = await getReceipts({
            page,
            pageSize,
            status: status ?? undefined,
            paymentType: paymentType ?? undefined,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            bookingId: bookingId ?? undefined,
        });

        const receipts = result.receipts.map((rec: any) => ({
            id: rec.id,
            receiptNumber: rec.receiptNumber,
            amount: rec.amount.toString(),
            amountInWords: rec.amountInWords,
            paymentType: rec.paymentType,
            remainingBalance: rec.remainingBalance.toString(),
            status: rec.status,
            createdAt: rec.createdAt,
            payment: rec.payment ? {
                id: rec.payment.id,
                method: rec.payment.method,
                transactionId: rec.payment.transactionId,
                booking: rec.payment.booking,
            } : null,
            invoice: rec.invoice ? {
                invoiceNumber: rec.invoice.invoiceNumber,
            } : null,
            collectedBy: rec.collectedBy,
        }));

        return ok({
            receipts,
            pagination: {
                page: result.page,
                pageSize: result.pageSize,
                total: result.total,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error fetching receipts:', error);
        return serverError('Failed to fetch receipts');
    }
}
