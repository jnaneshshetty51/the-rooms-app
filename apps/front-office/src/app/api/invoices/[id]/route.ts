// apps/front-office/src/app/api/invoices/[id]/route.ts
// Individual invoice operations: get, cancel, pdf

import { NextRequest } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { getInvoiceById, cancelInvoice } from '@the-rooms/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// ─── Get Invoice ───────────────────────────────────────────────────────────────
/**
 * GET /api/invoices/[id]
 * Get invoice by ID with all details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest('Unauthorized');
        }

        const { id } = await params;

        const invoice = await getInvoiceById(id);

        if (!invoice) {
            return badRequest('Invoice not found');
        }

        // Cast to any to bypass Prisma type inference issues
        const inv: any = invoice;

        return ok({
            invoice: {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                status: inv.status,
                subtotal: inv.subtotal?.toString() ?? '0',
                cgst: inv.cgst?.toString() ?? '0',
                sgst: inv.sgst?.toString() ?? '0',
                igst: inv.igst?.toString() ?? '0',
                taxAmount: inv.taxAmount?.toString() ?? '0',
                roundOff: inv.roundOff?.toString() ?? '0',
                totalAmount: inv.totalAmount?.toString() ?? '0',
                placeOfSupply: inv.placeOfSupply,
                isInterstate: inv.isInterstate,
                guestGstin: inv.guestGstin,
                pdfUrl: inv.pdfUrl,
                issuedAt: inv.issuedAt,
                cancelledAt: inv.cancelledAt,
                cancellationReason: inv.cancellationReason,
                items: (inv.items ?? []).map((item: any) => ({
                    id: item.id,
                    description: item.description,
                    hsnCode: item.hsnCode,
                    quantity: item.quantity,
                    rate: item.rate?.toString() ?? '0',
                    amount: item.amount?.toString() ?? '0',
                    taxRate: item.taxRate?.toString() ?? '0',
                    cgst: item.cgst?.toString() ?? '0',
                    sgst: item.sgst?.toString() ?? '0',
                    igst: item.igst?.toString() ?? '0',
                    taxAmount: item.taxAmount?.toString() ?? '0',
                    totalAmount: item.totalAmount?.toString() ?? '0',
                    serviceDate: item.serviceDate,
                })),
                booking: inv.booking ? {
                    id: inv.booking.id,
                    bookingNumber: inv.booking.bookingNumber,
                    checkIn: inv.booking.checkIn,
                    checkOut: inv.booking.checkOut,
                    guest: inv.booking.guest,
                    room: inv.booking.room,
                    property: inv.booking.property,
                } : null,
                payments: (inv.payments ?? []).map((payment: any) => ({
                    id: payment.id,
                    amount: payment.amount?.toString() ?? '0',
                    method: payment.method,
                    status: payment.status,
                    transactionId: payment.transactionId,
                    createdAt: payment.createdAt,
                })),
                receipts: (inv.receipts ?? []).map((receipt: any) => ({
                    id: receipt.id,
                    receiptNumber: receipt.receiptNumber,
                    amount: receipt.amount?.toString() ?? '0',
                    createdAt: receipt.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        return serverError('Failed to fetch invoice');
    }
}

// ─── Cancel Invoice ─────────────────────────────────────────────────────────────
/**
 * POST /api/invoices/[id]/cancel
 * Cancel an invoice (immutable - only cancelled, never edited)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest('Unauthorized');
        }

        const userRole = (session.user as { role?: string }).role;
        const userId = (session.user as { id: string }).id;

        // Only ADMIN and SUPER_ADMIN can cancel invoices
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '')) {
            return badRequest('Insufficient permissions to cancel invoices');
        }

        if (!userId) {
            return badRequest('User not identified');
        }

        const { id } = await params;
        const body = await request.json();
        const { reason } = body;

        if (!reason) {
            return badRequest('Cancellation reason is required');
        }

        const invoice = await getInvoiceById(id);

        if (!invoice) {
            return badRequest('Invoice not found');
        }

        if ((invoice as any).status === 'CANCELLED') {
            return badRequest('Invoice is already cancelled');
        }

        await cancelInvoice(id, userId, reason);

        // Create audit log
        await createAuditLog({
            userId,
            action: 'UPDATE',
            entity: 'invoice',
            entityId: id,
            metadata: {
                action: 'cancel',
                invoiceNumber: invoice.invoiceNumber,
                reason,
            },
            ipAddress: getClientIp(request),
        });

        return ok({ message: 'Invoice cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling invoice:', error);
        if (error instanceof Error && error.message.includes('already cancelled')) {
            return badRequest(error.message);
        }
        return serverError('Failed to cancel invoice');
    }
}
