// apps/front-office/src/app/api/payments/[id]/refund/route.ts
// Payment refund API

import { NextRequest } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db, Prisma } from '@the-rooms/db';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { createRefundReceipt } from '@the-rooms/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// ─── Process Refund ────────────────────────────────────────────────────────────
/**
 * POST /api/payments/[id]/refund
 * Process a refund for a payment
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest('Unauthorized');
        }

        const userRole = (session.user as { role?: string }).role;
        const userId = (session.user as { id: string }).id;

        // Only ADMIN and SUPER_ADMIN can process refunds
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '')) {
            return badRequest('Insufficient permissions to process refunds');
        }

        if (!userId) {
            return badRequest('User not identified');
        }

        const { id } = await params;
        const body = await request.json();
        const { reason, refundAmount } = body;

        if (!reason) {
            return badRequest('Refund reason is required');
        }

        // Get the payment
        const payment = await db.payment.findUnique({
            where: { id },
            include: { booking: true },
        });

        if (!payment) {
            return badRequest('Payment not found');
        }

        if (payment.status !== 'PAID') {
            return badRequest('Only paid payments can be refunded');
        }

        if ((payment as any).status === 'REFUNDED') {
            return badRequest('Payment has already been refunded');
        }

        // Determine refund amount
        const maxRefundAmount = payment.amount.toNumber();
        const actualRefundAmount = refundAmount
            ? Math.min(refundAmount, maxRefundAmount)
            : maxRefundAmount;

        if (actualRefundAmount <= 0) {
            return badRequest('Invalid refund amount');
        }

        // Record the refund
        const updatedPayment = await db.payment.update({
            where: { id },
            data: {
                status: 'REFUNDED',
                refundReason: reason,
                refundAmount: new Prisma.Decimal(actualRefundAmount),
                refundStatus: 'PROCESSED',
            },
        });

        // Create refund receipt
        const refundReceipt = await createRefundReceipt(
            id,
            new Prisma.Decimal(actualRefundAmount),
            userId
        );

        // Update booking payment status
        const totalPaid = await db.payment.aggregate({
            where: {
                bookingId: payment.bookingId,
                status: { in: ['PAID', 'REFUNDED'] }
            },
            _sum: { amount: true },
        });

        const totalRefunded = await db.payment.aggregate({
            where: {
                bookingId: payment.bookingId,
                status: 'REFUNDED'
            },
            _sum: { refundAmount: true },
        });

        const paidAmount = (totalPaid._sum.amount ?? new Prisma.Decimal(0)).toNumber();
        const refundedAmount = (totalRefunded._sum.refundAmount ?? new Prisma.Decimal(0)).toNumber();
        const netPaid = paidAmount - refundedAmount;

        let paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'REFUNDED' | 'OVERPAID' = 'REFUNDED';
        if (netPaid > payment.booking.totalAmount.toNumber()) {
            paymentStatus = 'OVERPAID';
        } else if (netPaid > 0 && netPaid < payment.booking.totalAmount.toNumber()) {
            paymentStatus = 'PARTIAL';
        } else if (netPaid === 0) {
            paymentStatus = 'PENDING';
        }

        await db.booking.update({
            where: { id: payment.bookingId },
            data: { paymentStatus },
        });

        // Create audit log
        await createAuditLog({
            userId,
            bookingId: payment.bookingId,
            action: 'PAYMENT',
            entity: 'payment',
            entityId: id,
            metadata: {
                action: 'refund',
                originalAmount: payment.amount.toString(),
                refundAmount: actualRefundAmount.toString(),
                reason,
                receiptNumber: refundReceipt.receiptNumber,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            refund: {
                paymentId: id,
                originalAmount: payment.amount.toString(),
                refundAmount: actualRefundAmount.toString(),
                refundReason: reason,
                refundStatus: updatedPayment.refundStatus,
                receiptNumber: refundReceipt.receiptNumber,
                paymentStatus,
            },
        });
    } catch (error) {
        console.error('Error processing refund:', error);
        return serverError('Failed to process refund');
    }
}
