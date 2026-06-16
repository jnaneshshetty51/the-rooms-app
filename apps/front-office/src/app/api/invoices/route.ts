// apps/front-office/src/app/api/invoices/route.ts
// Invoice generation and management API
// GST-compliant invoice system for India

import { NextRequest } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db, Prisma } from '@the-rooms/db';
import { ok, created, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import {
    generateInvoice,
    buildInvoiceLineItems,
    getInvoices,
    getInvoiceByBookingId,
} from '@the-rooms/db';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface InvoiceListItem {
    id: string;
    invoiceNumber: string;
    status: string;
    subtotal: string;
    taxAmount: string;
    totalAmount: string;
    issuedAt: Date | null;
    booking: {
        id: string;
        bookingNumber: string;
        guest: { name: string; phone: string };
        room: { roomNumber: string };
    } | null;
}

// ─── Generate Invoice ─────────────────────────────────────────────────────────
/**
 * POST /api/invoices/generate
 * Generate invoice for a booking
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest('Unauthorized');
        }

        const userRole = (session.user as { role?: string }).role;
        const userId = (session.user as { id: string }).id;

        // Only FRONT_OFFICE, ADMIN, SUPER_ADMIN can generate invoices
        if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '')) {
            return badRequest('Insufficient permissions to generate invoices');
        }

        const body = await request.json();
        const { bookingId, placeOfSupply, guestGstin, isInterstate } = body;

        if (!bookingId) {
            return badRequest('Booking ID is required');
        }

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: {
                guest: true,
                room: true,
                property: true,
                roomCharges: { orderBy: { chargeDate: 'asc' } },
            },
        });

        if (!booking) {
            return badRequest('Booking not found');
        }

        // Check if invoice already exists
        const existingInvoice = await getInvoiceByBookingId(bookingId);
        if (existingInvoice) {
            return badRequest(`Invoice already exists: ${existingInvoice.invoiceNumber}`);
        }

        // Build line items from room charges and addons
        const lineItems = await buildInvoiceLineItems(bookingId, isInterstate ?? false);

        if (lineItems.length === 0) {
            return badRequest('No charges found to generate invoice');
        }

        // Generate invoice
        const invoice = await generateInvoice({
            bookingId,
            lineItems,
            placeOfSupply,
            guestGstin,
            isInterstate,
        });

        // Create audit log
        await createAuditLog({
            userId,
            bookingId,
            action: 'CREATE',
            entity: 'invoice',
            entityId: invoice.id,
            metadata: {
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: invoice.totalAmount.toString(),
                lineItemsCount: lineItems.length,
            },
            ipAddress: getClientIp(request),
        });

        return created({
            invoice: {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                status: invoice.status,
                subtotal: invoice.subtotal.toString(),
                cgst: invoice.cgst.toString(),
                sgst: invoice.sgst.toString(),
                igst: invoice.igst.toString(),
                taxAmount: invoice.taxAmount.toString(),
                roundOff: invoice.roundOff.toString(),
                totalAmount: invoice.totalAmount.toString(),
                issuedAt: invoice.issuedAt,
            },
        });
    } catch (error) {
        console.error('Error generating invoice:', error);
        if (error instanceof Error && error.message.includes('already exists')) {
            return badRequest(error.message);
        }
        return serverError('Failed to generate invoice');
    }
}

// ─── List Invoices ────────────────────────────────────────────────────────────
/**
 * GET /api/invoices
 * List all invoices with pagination and filters
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
        const status = searchParams.get('status') as 'DRAFT' | 'ISSUED' | 'CANCELLED' | null;
        const dateFrom = searchParams.get('from');
        const dateTo = searchParams.get('to');
        const bookingId = searchParams.get('bookingId');

        const result = await getInvoices({
            page,
            pageSize,
            status: status ?? undefined,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            bookingId: bookingId ?? undefined,
        });

        const invoices: InvoiceListItem[] = result.invoices.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
            subtotal: inv.subtotal?.toString() ?? '0',
            taxAmount: inv.taxAmount?.toString() ?? '0',
            totalAmount: inv.totalAmount?.toString() ?? '0',
            issuedAt: inv.issuedAt,
            booking: inv.booking ? {
                id: inv.booking.id,
                bookingNumber: inv.booking.bookingNumber,
                guest: inv.booking.guest,
                room: inv.booking.room,
            } : null,
        }));

        return ok({
            invoices,
            pagination: {
                page: result.page,
                pageSize: result.pageSize,
                total: result.total,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return serverError('Failed to fetch invoices');
    }
}
