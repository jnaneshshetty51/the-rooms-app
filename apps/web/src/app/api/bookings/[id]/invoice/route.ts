// GET /api/bookings/[id]/invoice — return the invoice PDF URL for a booking
import { NextRequest } from 'next/server';
import { ok, notFound, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const invoice = await db.invoice.findFirst({
      where: { bookingId: id },
      select: { id: true, invoiceNumber: true, pdfUrl: true, issuedAt: true },
    });

    if (!invoice) return notFound('Invoice not yet generated');

    return ok(invoice);
  } catch {
    return serverError();
  }
}
