// apps/front-office/src/app/api/monthly-billing/invoices/route.ts
// POST /api/monthly-billing/invoices - Create monthly invoice
// GET /api/monthly-billing/invoices/[bookingId] - Get invoices for booking

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, created } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

const createInvoiceSchema = z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = createInvoiceSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { bookingId, month, year, notes } = parsed.data;

        const { createMonthlyInvoice } = await import('@the-rooms/db/queries/monthlyBillingQueries');
        const invoice = await createMonthlyInvoice(bookingId, month, year, { notes });

        const userId = (session.user as { id?: string }).id;
        await createAuditLog({
            userId,
            action: 'MONTHLY_INVOICE_CREATED',
            entity: 'invoice',
            entityId: invoice.id,
            metadata: {
                bookingId,
                invoiceNumber: invoice.invoiceNumber,
                month,
                year,
            },
            ipAddress: getClientIp(request),
        });

        return created({
            message: 'Monthly invoice created',
            invoice,
        });
    } catch (error) {
        console.error('[MONTHLY_INVOICE_POST]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}
