// apps/front-office/src/app/api/receipts/[id]/route.ts
// Individual receipt operations: get, cancel

import { NextRequest } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { getReceiptById, cancelReceipt } from '@the-rooms/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// ─── Get Receipt ───────────────────────────────────────────────────────────────
/**
 * GET /api/receipts/[id]
 * Get receipt by ID with all details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest('Unauthorized');
        }

        const { id } = await params;

        const receipt = await getReceiptById(id);

        if (!receipt) {
            return badRequest('Receipt not found');
        }

        return ok({
            receipt: {
                id: receipt.id,
                receiptNumber: receipt.receiptNumber,
                amount: receipt.amount.toString(),
                amountInWords: receipt.amountInWords,
                paymentType: receipt.paymentType,
                remainingBalance: receipt.remainingBalance.toString(),
                status: receipt.status,
                pdfUrl: receipt.pdfUrl,
                createdAt: receipt.createdAt,
                payment: receipt.payment ? {
                    id: receipt.payment.id,
                    amount: receipt.payment.amount.toString(),
                    method: receipt.payment.method,
                    transactionId: receipt.payment.transactionId,
                    status: receipt.payment.status,
                    createdAt: receipt.payment.createdAt,
                    booking: receipt.payment.booking ? {
                        id: receipt.payment.booking.id,
                        bookingNumber: receipt.payment.booking.bookingNumber,
                        checkIn: receipt.payment.booking.checkIn,
                        checkOut: receipt.payment.booking.checkOut,
                        guest: receipt.payment.booking.guest,
                        room: receipt.payment.booking.room,
                        property: receipt.payment.booking.property,
                    } : null,
                } : null,
                invoice: receipt.invoice ? {
                    id: receipt.invoice.id,
                    invoiceNumber: receipt.invoice.invoiceNumber,
                    totalAmount: receipt.invoice.totalAmount.toString(),
                } : null,
                collectedBy: receipt.collectedBy ? {
                    id: receipt.collectedBy.id,
                    name: receipt.collectedBy.name,
                    email: receipt.collectedBy.email,
                } : null,
            },
        });
    } catch (error) {
        console.error('Error fetching receipt:', error);
        return serverError('Failed to fetch receipt');
    }
}

// ─── Cancel Receipt ───────────────────────────────────────────────────────────
/**
 * POST /api/receipts/[id]/cancel
 * Cancel a receipt (admin only - for error correction)
 * Note: Receipts should generally not be cancelled - refunds are preferred
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest('Unauthorized');
        }

        const userRole = (session.user as { role?: string }).role;
        const userId = (session.user as { id?: string }).id;

        // Only ADMIN and SUPER_ADMIN can cancel receipts
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '')) {
            return badRequest('Insufficient permissions to cancel receipts');
        }

        const { id } = await params;
        const body = await request.json();
        const { reason } = body;

        if (!reason) {
            return badRequest('Cancellation reason is required');
        }

        const receipt = await getReceiptById(id);

        if (!receipt) {
            return badRequest('Receipt not found');
        }

        if ((receipt as any).status === 'CANCELLED') {
            return badRequest('Receipt is already cancelled');
        }

        await cancelReceipt(id, reason);

        // Create audit log
        await createAuditLog({
            userId,
            action: 'UPDATE',
            entity: 'receipt',
            entityId: id,
            metadata: {
                action: 'cancel',
                receiptNumber: receipt.receiptNumber,
                reason,
            },
            ipAddress: getClientIp(request),
        });

        return ok({ message: 'Receipt cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling receipt:', error);
        if (error instanceof Error && error.message.includes('already cancelled')) {
            return badRequest(error.message);
        }
        return serverError('Failed to cancel receipt');
    }
}
