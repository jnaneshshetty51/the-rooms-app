// packages/db/src/queries/invoiceQueries.ts
// Invoice generation and management queries

import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * Generate invoice number in format: INV-YYYYMMDD-XXXX
 */
async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Get count of invoices created today
  const count = await prisma.invoice.count({
    where: {
      issuedAt: {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lt: new Date(today.setHours(23, 59, 59, 999)),
      },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `INV-${dateStr}-${sequence}`;
}

/**
 * Generate and save invoice for a booking
 */
export async function generateInvoice(
  paymentId: string,
  bookingId: string
): Promise<{
  id: string;
  invoiceNumber: string;
  pdfUrl: string | null;
  createdAt: Date;
}> {
  // Check if invoice already exists
  const existingInvoice = await prisma.invoice.findUnique({
    where: { bookingId },
  });

  if (existingInvoice) {
    return {
      id: existingInvoice.id,
      invoiceNumber: existingInvoice.invoiceNumber,
      pdfUrl: existingInvoice.pdfUrl,
      createdAt: existingInvoice.issuedAt,
    };
  }

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  // Create invoice record
  const invoice = await prisma.invoice.create({
    data: {
      bookingId,
      paymentId,
      invoiceNumber,
      issuedAt: new Date(),
    },
  });

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    pdfUrl: invoice.pdfUrl,
    createdAt: invoice.issuedAt,
  };
}

/**
 * Update invoice PDF URL after generation
 */
export async function updateInvoicePdfUrl(
  invoiceId: string,
  pdfUrl: string
): Promise<void> {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { pdfUrl },
  });
}

/**
 * Get invoice by booking ID
 */
export async function getInvoiceByBookingId(bookingId: string) {
  return prisma.invoice.findUnique({
    where: { bookingId },
    include: {
      booking: {
        include: {
          guest: true,
          room: true,
        },
      },
      payment: true,
    },
  });
}

/**
 * Get invoice by number
 */
export async function getInvoiceByNumber(invoiceNumber: string) {
  return prisma.invoice.findUnique({
    where: { invoiceNumber },
    include: {
      booking: {
        include: {
          guest: true,
          room: true,
        },
      },
      payment: true,
    },
  });
}
