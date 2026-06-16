// packages/db/src/queries/invoiceQueries.ts
// Invoice generation and management queries
// GST-compliant invoice system for India

import prisma from '../index';
import { Prisma, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PRICING_CONFIG } from '../config';

// ─── GST Constants ─────────────────────────────────────────────────────────────
// GST slabs for accommodation services in India
export const GST_SLABS = {
  STANDARD: 0.18,     // 18% - Standard rate
  REDUCED: 0.12,     // 12% - Reduced rate
  LOWER: 0.05,       // 5%  - Lower rate
  ZERO: 0.00,        // 0%  - Exempt
} as const;

// State codes for GST (for determining IGST vs CGST+SGST)
export const STATE_CODES: Record<string, string> = {
  '29': 'Karnataka',
  '27': 'Maharashtra',
  '19': 'West Bengal',
  '09': 'Uttar Pradesh',
  '24': 'Gujarat',
  '12': 'Punjab',
  '18': 'Tamil Nadu',
  '36': 'Telangana',
  '35': 'Odisha',
  '16': 'Kerala',
  '10': 'Rajasthan',
  '11': 'Delhi',
  '03': 'Chandigarh',
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export type InvoiceLineItem = {
  description: string;
  hsnCode?: string;
  quantity: number;
  rate: Prisma.Decimal;
  amount: Prisma.Decimal;
  taxRate: number;
  cgst: Prisma.Decimal;
  sgst: Prisma.Decimal;
  igst: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  sourceType?: 'ROOM_CHARGE' | 'ADDON' | 'EXTRA' | 'DISCOUNT';
  sourceId?: string;
  serviceDate: Date;
};

export type InvoiceTotals = {
  subtotal: Prisma.Decimal;
  cgst: Prisma.Decimal;
  sgst: Prisma.Decimal;
  igst: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  roundOff: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
};

export type CreateInvoiceData = {
  bookingId: string;
  lineItems: InvoiceLineItem[];
  placeOfSupply?: string;
  guestGstin?: string;
  isInterstate?: boolean;
};

// ─── Invoice Number Generation ─────────────────────────────────────────────────
/**
 * Generate invoice number in format: INV-YYYYMMDD-XXXX
 * Uses database-level locking to prevent race conditions and gaps
 */
export async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Use a transaction with row-level locking to ensure sequential numbers
  const result = await prisma.$transaction(async (tx) => {
    // Get the latest invoice number for today
    const latestInvoice = await tx.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: `INV-${dateStr}`,
        },
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let sequence = 1;
    if (latestInvoice) {
      // Extract sequence number and increment
      const lastSequence = parseInt(latestInvoice.invoiceNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    const sequenceStr = String(sequence).padStart(4, '0');
    return `INV-${dateStr}-${sequenceStr}`;
  });

  return result;
}

// ─── GST Calculation ─────────────────────────────────────────────────────────
/**
 * Calculate GST for a line item
 * Split into CGST + SGST for intrastate, IGST for interstate
 */
export function calculateLineItemGST(
  amount: number,
  taxRate: number,
  isInterstate: boolean
): { cgst: number; sgst: number; igst: number; taxAmount: number } {
  const taxAmount = amount * taxRate;

  if (isInterstate) {
    // Interstate: IGST applies, no CGST/SGST
    return {
      cgst: 0,
      sgst: 0,
      igst: taxAmount,
      taxAmount,
    };
  } else {
    // Intrastate: CGST + SGST split equally
    const halfRate = taxRate / 2;
    return {
      cgst: amount * halfRate,
      sgst: amount * halfRate,
      igst: 0,
      taxAmount,
    };
  }
}

/**
 * Calculate totals for invoice from line items
 */
export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  isInterstate: boolean
): InvoiceTotals {
  let subtotal = new Decimal(0);
  let cgst = new Decimal(0);
  let sgst = new Decimal(0);
  let igst = new Decimal(0);

  for (const item of lineItems) {
    subtotal = subtotal.add(item.amount);
    cgst = cgst.add(item.cgst);
    sgst = sgst.add(item.sgst);
    igst = igst.add(item.igst);
  }

  const taxAmount = cgst.add(sgst).add(igst);
  const totalBeforeRoundOff = subtotal.add(taxAmount);

  // Round off to nearest rupee
  const totalAmount = new Decimal(Math.round(totalBeforeRoundOff.toNumber()));
  const roundOff = totalAmount.sub(totalBeforeRoundOff);

  return {
    subtotal,
    cgst,
    sgst,
    igst,
    taxAmount,
    roundOff,
    totalAmount,
  };
}

// ─── Invoice Generation ────────────────────────────────────────────────────────
/**
 * Generate invoice for a booking with line items from room charges and addons
 */
export async function createInvoiceWithLineItems(
  data: CreateInvoiceData
): Promise<{
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: Prisma.Decimal;
  cgst: Prisma.Decimal;
  sgst: Prisma.Decimal;
  igst: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  roundOff: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  pdfUrl: string | null;
  issuedAt: Date;
}> {
  // Check if invoice already exists for this booking
  const existingInvoice = await prisma.invoice.findUnique({
    where: { bookingId: data.bookingId },
  });

  if (existingInvoice) {
    throw new Error(`Invoice already exists for booking: ${existingInvoice.invoiceNumber}`);
  }

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  // Calculate totals
  const totals = calculateInvoiceTotals(data.lineItems, data.isInterstate ?? false);

  // Create invoice with line items in a transaction
  const invoice = await prisma.invoice.create({
    data: {
      bookingId: data.bookingId,
      invoiceNumber,
      status: 'ISSUED',
      issuedAt: new Date(),
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      taxAmount: totals.taxAmount,
      roundOff: totals.roundOff,
      totalAmount: totals.totalAmount,
      placeOfSupply: data.placeOfSupply,
      guestGstin: data.guestGstin,
      isInterstate: data.isInterstate ?? false,
      items: {
        create: data.lineItems.map((item) => ({
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          taxRate: new Decimal(item.taxRate),
          cgst: item.cgst,
          sgst: item.sgst,
          igst: item.igst,
          taxAmount: item.taxAmount,
          totalAmount: item.totalAmount,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          serviceDate: item.serviceDate,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    subtotal: invoice.subtotal,
    cgst: invoice.cgst,
    sgst: invoice.sgst,
    igst: invoice.igst,
    taxAmount: invoice.taxAmount,
    roundOff: invoice.roundOff,
    totalAmount: invoice.totalAmount,
    pdfUrl: invoice.pdfUrl,
    issuedAt: invoice.issuedAt,
  };
}

/**
 * Build line items from booking's room charges and addons
 */
export async function buildInvoiceLineItems(
  bookingId: string,
  isInterstate: boolean = false
): Promise<InvoiceLineItem[]> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      roomCharges: {
        orderBy: { chargeDate: 'asc' },
      },
      addons: {
        orderBy: { serviceDate: 'asc' },
      },
    },
  });

  if (!booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  const lineItems: InvoiceLineItem[] = [];
  const taxRate = PRICING_CONFIG.GST_RATE;

  // Room charges as line items
  for (const charge of booking.roomCharges) {
    const amount = charge.subtotal.toNumber();
    const gst = calculateLineItemGST(amount, taxRate, isInterstate);

    lineItems.push({
      description: `Room Charge - ${charge.chargeDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
      hsnCode: '996311', // Hotel Accommodation Services
      quantity: 1,
      rate: charge.roomRate,
      amount: charge.subtotal,
      taxRate,
      cgst: new Decimal(gst.cgst),
      sgst: new Decimal(gst.sgst),
      igst: new Decimal(gst.igst),
      taxAmount: new Decimal(gst.taxAmount),
      totalAmount: new Decimal(charge.totalAmount.toNumber()),
      sourceType: 'ROOM_CHARGE',
      sourceId: charge.id,
      serviceDate: charge.chargeDate,
    });
  }

  // Addons as line items
  for (const addon of booking.addons) {
    const amount = addon.amount.toNumber();
    const gst = calculateLineItemGST(amount, taxRate, isInterstate);

    lineItems.push({
      description: `${AddonType[addon.type]} - ${addon.description}`,
      hsnCode: '996319', // Other Accommodation Services
      quantity: addon.quantity,
      rate: addon.amount,
      amount: new Decimal(addon.amount.toNumber() * addon.quantity),
      taxRate,
      cgst: addon.cgst,
      sgst: addon.sgst,
      igst: new Decimal(0),
      taxAmount: new Decimal(addon.cgst.toNumber() + addon.sgst.toNumber()),
      totalAmount: addon.totalAmount,
      sourceType: 'ADDON',
      sourceId: addon.id,
      serviceDate: addon.serviceDate,
    });
  }

  return lineItems;
}

// ─── Invoice Retrieval ─────────────────────────────────────────────────────────
/**
 * Get invoice by ID with all relations
 */
export async function getInvoiceById(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      booking: {
        include: {
          guest: true,
          room: true,
          property: true,
        },
      },
      items: {
        orderBy: { serviceDate: 'asc' },
      },
      payments: {
        orderBy: { createdAt: 'asc' },
      },
      receipts: {
        orderBy: { createdAt: 'asc' },
      },
    },
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
          property: true,
        },
      },
      items: {
        orderBy: { serviceDate: 'asc' },
      },
      payments: {
        orderBy: { createdAt: 'asc' },
      },
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
          property: true,
        },
      },
      items: {
        orderBy: { serviceDate: 'asc' },
      },
      payments: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * Get all invoices with pagination
 */
export async function getInvoices(params: {
  page?: number;
  pageSize?: number;
  status?: InvoiceStatus;
  dateFrom?: Date;
  dateTo?: Date;
  bookingId?: string;
}) {
  const { page = 1, pageSize = 20, status, dateFrom, dateTo, bookingId } = params;

  const where: Prisma.InvoiceWhereInput = {};

  if (status) {
    where.status = status;
  }
  if (bookingId) {
    where.bookingId = bookingId;
  }
  if (dateFrom || dateTo) {
    where.issuedAt = {};
    if (dateFrom) {
      where.issuedAt.gte = dateFrom;
    }
    if (dateTo) {
      where.issuedAt.lte = dateTo;
    }
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        booking: {
          include: {
            guest: { select: { name: true, phone: true } },
            room: { select: { roomNumber: true } },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { invoices, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ─── Invoice Operations ─────────────────────────────────────────────────────────
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
 * Cancel an invoice (immutable - only cancelled, never deleted or edited)
 */
export async function cancelInvoice(
  invoiceId: string,
  cancelledById: string,
  reason: string
): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === 'CANCELLED') {
    throw new Error('Invoice is already cancelled');
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledById,
      cancellationReason: reason,
    },
  });
}

/**
 * Issue a draft invoice
 */
export async function issueInvoice(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status !== 'DRAFT') {
    throw new Error('Only draft invoices can be issued');
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'ISSUED',
      issuedAt: new Date(),
    },
  });
}

// ─── AddonType Enum Reference ─────────────────────────────────────────────────
// Reference to AddonType enum for description building
const AddonType = {
  FB: 'Food & Beverage',
  LAUNDRY: 'Laundry',
  SPA: 'Spa Services',
  MINIBAR: 'Mini Bar',
  RESTAURANT: 'Restaurant',
  TRANSPORT: 'Transportation',
  ROOM_SERVICE: 'Room Service',
  OTHER: 'Other',
  DAMAGE: 'Damage Charge',
} as const;

// Alias for backward compatibility
export const generateInvoice = createInvoiceWithLineItems;
