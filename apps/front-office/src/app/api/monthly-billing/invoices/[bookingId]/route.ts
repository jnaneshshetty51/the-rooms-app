// apps/front-office/src/app/api/monthly-billing/invoices/[bookingId]/route.ts
// GET /api/monthly-billing/invoices/[bookingId] - Get invoices for booking
// GET /api/monthly-billing/invoices/[bookingId]/[month]/[year] - Get specific invoice

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, serverError, notFound } from '@the-rooms/api';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ bookingId: string; month?: string; year?: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { bookingId, month, year } = await params;

        const { getMonthlyInvoices, getMonthlyInvoice } = await import(
            '@the-rooms/db/queries/monthlyBillingQueries'
        );

        // If month and year are provided, get specific invoice
        if (month && year) {
            const invoice = await getMonthlyInvoice(
                bookingId,
                parseInt(month),
                parseInt(year)
            );

            if (!invoice) {
                return notFound('Invoice', 'INVOICE_NOT_FOUND');
            }

            return ok({ invoice });
        }

        // Otherwise get all invoices for the booking
        const invoices = await getMonthlyInvoices(bookingId);
        return ok({ invoices });
    } catch (error) {
        console.error('[MONTHLY_INVOICE_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
