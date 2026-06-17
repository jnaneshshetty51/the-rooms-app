// packages/db/src/queries/monthlyBillingQueries.ts
// Long-stay guest monthly billing - Scenario 76

import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * Generate a monthly invoice number
 */
export async function generateMonthlyInvoiceNumber(month: number, year: number): Promise<string> {
    const prefix = `MIN-${year}${String(month).padStart(2, '0')}-`;

    const lastInvoice = await prisma.invoice.findFirst({
        where: {
            invoiceNumber: { startsWith: prefix },
        },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
    });

    let nextNum = 1;
    if (lastInvoice) {
        const lastNum = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''));
        nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

/**
 * Create a monthly invoice for a booking
 */
export async function createMonthlyInvoice(
    bookingId: string,
    month: number,
    year: number,
    data?: {
        roomCharge?: number;
        addonCharges?: number;
        discountAmount?: number;
        taxAmount?: number;
        totalAmount?: number;
        notes?: string;
    }
) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: true,
            room: true,
        },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    // Check if invoice already exists for this month/year
    const existingInvoice = await prisma.invoice.findFirst({
        where: {
            bookingId,
            issuedAt: {
                gte: new Date(year, month - 1, 1),
                lt: new Date(year, month, 1),
            },
        },
    });

    if (existingInvoice) {
        throw new Error('Monthly invoice already exists for this period');
    }

    // Calculate charges for the month
    const charges = await calculateMonthlyCharges(bookingId, month, year);

    const invoiceNumber = await generateMonthlyInvoiceNumber(month, year);

    return prisma.invoice.create({
        data: {
            bookingId,
            invoiceNumber,
            issuedAt: new Date(year, month - 1, 15),
            subtotal: new Prisma.Decimal(charges.roomCharge + (charges.addonCharges || 0)),
            taxAmount: new Prisma.Decimal(data?.taxAmount ?? charges.taxAmount),
            totalAmount: new Prisma.Decimal(data?.totalAmount ?? charges.totalAmount),
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
        },
    });
}

/**
 * Get all monthly invoices for a booking
 */
export async function getMonthlyInvoices(bookingId: string) {
    return prisma.invoice.findMany({
        where: { bookingId },
        orderBy: { issuedAt: 'desc' },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
        },
    });
}

/**
 * Get a specific monthly invoice
 */
export async function getMonthlyInvoice(bookingId: string, month: number, year: number) {
    return prisma.invoice.findFirst({
        where: {
            bookingId,
            issuedAt: {
                gte: new Date(year, month - 1, 1),
                lt: new Date(year, month, 1),
            },
        },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
        },
    });
}

/**
 * Calculate monthly charges breakdown
 */
export async function calculateMonthlyCharges(
    bookingId: string,
    month: number,
    year: number
): Promise<{
    roomCharge: number;
    addonCharges: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    periodStart: Date;
    periodEnd: Date;
    nights: number;
}> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            room: true,
            addons: true,
        },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    // Calculate period for this month
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // Last day of month

    // Clamp to booking dates
    const effectiveStart = booking.checkIn > periodStart ? booking.checkIn : periodStart;
    const effectiveEnd = booking.checkOut < periodEnd ? booking.checkOut : periodEnd;

    const nights = Math.max(1, Math.ceil(
        (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
    ));

    // Get daily rate (use monthly rate if available and stay >= 28 nights)
    let dailyRate = Number(booking.room.basePriceDouble);

    if (booking.bookingType === 'MONTHLY' || nights >= 28) {
        const monthlyRate = booking.room.monthlyPriceDouble;
        if (monthlyRate) {
            dailyRate = Number(monthlyRate) / 30;
        }
    }

    const roomCharge = dailyRate * nights;

    // Calculate addon charges for this period
    const addonCharges = booking.addons
        .filter(a => a.createdAt >= effectiveStart && a.createdAt <= effectiveEnd)
        .reduce((sum, a) => sum + Number(a.amount), 0);

    // Apply long-stay discount if applicable
    const discountAmount = await applyMonthlyDiscount(bookingId, roomCharge + addonCharges);

    // Calculate tax (typically 18% GST in India)
    const subtotal = roomCharge + addonCharges - discountAmount;
    const taxAmount = subtotal * 0.18;

    const totalAmount = subtotal + taxAmount;

    return {
        roomCharge: Math.round(roomCharge * 100) / 100,
        addonCharges: Math.round(addonCharges * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        periodStart: effectiveStart,
        periodEnd: effectiveEnd,
        nights,
    };
}

/**
 * Apply long-stay discount to monthly billing
 */
export async function applyMonthlyDiscount(bookingId: string, amount: number): Promise<number> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    });

    if (!booking) {
        return 0;
    }

    // Calculate stay duration
    const nights = Math.ceil(
        (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Long-stay discounts based on nights
    let discountPercent = 0;
    if (nights >= 90) {
        discountPercent = 20; // 20% off for 90+ nights
    } else if (nights >= 60) {
        discountPercent = 15; // 15% off for 60+ nights
    } else if (nights >= 30) {
        discountPercent = 10; // 10% off for 30+ nights
    }

    return amount * (discountPercent / 100);
}

/**
 * Generate monthly invoices batch for a property
 */
export async function generateMonthlyInvoicesBatch(
    propertyId: string,
    month: number,
    year: number
): Promise<{
    generated: number;
    failed: number;
    invoices: Awaited<ReturnType<typeof prisma.invoice.findMany>>;
    errors: string[];
}> {
    // Find all active bookings for this property that overlap with the month
    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            checkIn: { lte: new Date(year, month, 0) },
            checkOut: { gte: new Date(year, month - 1, 1) },
            bookingType: 'MONTHLY',
        },
        include: {
            guest: true,
            room: true,
        },
    });

    const results = {
        generated: 0,
        failed: 0,
        invoices: [] as Awaited<ReturnType<typeof prisma.invoice.findMany>>,
        errors: [] as string[],
    };

    for (const booking of bookings) {
        try {
            // Check if invoice already exists
            const existing = await getMonthlyInvoice(booking.id, month, year);
            if (existing) {
                results.invoices.push(existing);
                results.generated++;
                continue;
            }

            const invoice = await createMonthlyInvoice(booking.id, month, year);
            results.invoices.push(invoice);
            results.generated++;
        } catch (error) {
            results.failed++;
            results.errors.push(
                `Booking ${booking.bookingNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    return results;
}

/**
 * Send monthly invoice to guest
 */
export async function sendMonthlyInvoice(invoiceId: string): Promise<{
    success: boolean;
    sentAt: Date;
    error?: string;
}> {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            booking: {
                include: {
                    guest: true,
                },
            },
        },
    });

    if (!invoice) {
        throw new Error('Invoice not found');
    }

    const sentAt = new Date();

    // Mark invoice as ISSUED when sent
    await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'ISSUED' },
    });

    return {
        success: true,
        sentAt,
    };
}

/**
 * Get monthly billing summary for a guest
 */
export async function getGuestMonthlyBillingSummary(guestId: string) {
    const invoices = await prisma.invoice.findMany({
        where: {
            booking: { guestId },
        },
        orderBy: { issuedAt: 'desc' },
    });

    const summary = {
        totalInvoices: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
        totalIssued: invoices
            .filter(inv => inv.status === 'ISSUED')
            .reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
        totalDraft: invoices
            .filter(inv => inv.status === 'DRAFT')
            .reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
        totalCancelled: invoices
            .filter(inv => inv.status === 'CANCELLED')
            .reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
    };

    return summary;
}
