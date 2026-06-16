import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * ─── Tax Report Queries ─────────────────────────────────────────────────────
 *
 * Functions for:
 * - Scenario 64: GST/tax reports
 */

// ─── GST/Tax Reports (Scenario 64) ──────────────────────────────────────────

// GST rates as per Indian regulations
const GST_RATES = {
    ROOM_RENT: 12,      // 12% for room rent
    FOOD_BEVERAGE: 18,  // 18% for food/beverages
    TCM: 5,             // 5% for TCM (Tax Collected at Source)
} as const;

export interface GSTReport {
    propertyId: string;
    month: number;
    year: number;
    totalRevenue: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    tcs: number; // Tax Collected at Source
    byInvoice: Array<{
        invoiceNumber: string;
        invoiceDate: Date;
        guestName: string;
        taxableAmount: number;
        cgst: number;
        sgst: number;
        igst: number;
        totalTax: number;
    }>;
    byService: Array<{
        serviceType: string;
        taxableAmount: number;
        taxAmount: number;
        rate: number;
    }>;
}

export interface TaxSummary {
    propertyId: string;
    startDate: Date;
    endDate: Date;
    totalRevenue: number;
    totalTaxable: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalTax: number;
    tcs: number;
    byRate: Array<{
        rate: number;
        taxableAmount: number;
        taxAmount: number;
    }>;
}

export interface InvoiceTaxBreakdown {
    invoiceId: string;
    invoiceNumber: string;
    bookingNumber: string;
    guestName: string;
    invoiceDate: Date;
    placeOfSupply: string;
    isInterstate: boolean;
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    taxAmount: number;
    totalAmount: number;
    items: Array<{
        description: string;
        hsnCode: string | null;
        taxableAmount: number;
        taxRate: number;
        cgst: number;
        sgst: number;
        igst: number;
        taxAmount: number;
        totalAmount: number;
    }>;
}

export interface TaxLiability {
    propertyId: string;
    startDate: Date;
    endDate: Date;
    totalRevenue: number;
    totalTaxCollected: number;
    totalTaxPayable: number;
    inputTaxCredit: number;
    netTaxLiability: number;
    tcsLiability: number;
    filingStatus: 'PENDING' | 'FILED' | 'OVERDUE';
    dueDate: Date;
}

/**
 * Get GST report for a specific month and year
 */
export async function getGSTReport(
    propertyId: string,
    month: number,
    year: number
): Promise<GSTReport> {
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all invoices for the month
    const invoices = await prisma.invoice.findMany({
        where: {
            booking: { propertyId },
            issuedAt: { gte: startDate, lte: endDate },
            status: { in: ['ISSUED', 'DRAFT'] },
        },
        include: {
            booking: {
                select: {
                    bookingNumber: true,
                    guest: { select: { name: true } },
                },
            },
            items: true,
        },
    });

    let totalRevenue = 0;
    let taxableAmount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let tcs = 0;

    const byInvoice: GSTReport['byInvoice'] = [];
    const serviceMap = new Map<string, { taxable: number; tax: number; rate: number }>();

    for (const invoice of invoices) {
        const invoiceCgst = Number(invoice.cgst);
        const invoiceSgst = Number(invoice.sgst);
        const invoiceIgst = Number(invoice.igst);
        const invoiceTax = Number(invoice.taxAmount);

        totalRevenue += Number(invoice.totalAmount);
        taxableAmount += Number(invoice.subtotal);
        cgst += invoiceCgst;
        sgst += invoiceSgst;
        igst += invoiceIgst;

        byInvoice.push({
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.issuedAt,
            guestName: invoice.booking.guest.name,
            taxableAmount: Number(invoice.subtotal),
            cgst: invoiceCgst,
            sgst: invoiceSgst,
            igst: invoiceIgst,
            totalTax: invoiceTax,
        });

        // Group by service type
        for (const item of invoice.items) {
            const serviceType = item.description;
            const existing = serviceMap.get(serviceType) || {
                taxable: 0,
                tax: 0,
                rate: Number(item.taxRate),
            };
            existing.taxable += Number(item.amount);
            existing.tax += Number(item.taxAmount);
            serviceMap.set(serviceType, existing);
        }
    }

    // Calculate TCS (Tax Collected at Source) - usually 0% for hotels
    tcs = 0;

    const byService = Array.from(serviceMap.entries()).map(([serviceType, data]) => ({
        serviceType,
        taxableAmount: data.taxable,
        taxAmount: data.tax,
        rate: data.rate,
    }));

    return {
        propertyId,
        month,
        year,
        totalRevenue,
        taxableAmount,
        cgst,
        sgst,
        igst,
        totalTax: cgst + sgst + igst,
        tcs,
        byInvoice,
        byService,
    };
}

/**
 * Get tax summary for a date range
 */
export async function getTaxSummary(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<TaxSummary> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
        where: {
            booking: { propertyId },
            issuedAt: { gte: startOfDay, lte: endOfDay },
            status: { in: ['ISSUED', 'DRAFT'] },
        },
        include: {
            items: true,
        },
    });

    let totalRevenue = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let tcs = 0;

    // Group by tax rate
    const rateMap = new Map<number, { taxable: number; tax: number }>();

    for (const invoice of invoices) {
        totalRevenue += Number(invoice.totalAmount);
        totalTaxable += Number(invoice.subtotal);
        totalCgst += Number(invoice.cgst);
        totalSgst += Number(invoice.sgst);
        totalIgst += Number(invoice.igst);

        for (const item of invoice.items) {
            const rate = Number(item.taxRate);
            const existing = rateMap.get(rate) || { taxable: 0, tax: 0 };
            existing.taxable += Number(item.amount);
            existing.tax += Number(item.taxAmount);
            rateMap.set(rate, existing);
        }
    }

    const byRate = Array.from(rateMap.entries())
        .map(([rate, data]) => ({
            rate,
            taxableAmount: data.taxable,
            taxAmount: data.tax,
        }))
        .sort((a, b) => a.rate - b.rate);

    return {
        propertyId,
        startDate: startOfDay,
        endDate: endOfDay,
        totalRevenue,
        totalTaxable,
        totalCgst,
        totalSgst,
        totalIgst,
        totalTax: totalCgst + totalSgst + totalIgst,
        tcs,
        byRate,
    };
}

/**
 * Get invoice tax breakdown
 */
export async function getInvoiceTaxBreakdown(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<InvoiceTaxBreakdown[]> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
        where: {
            booking: { propertyId },
            issuedAt: { gte: startOfDay, lte: endOfDay },
            status: { in: ['ISSUED', 'DRAFT'] },
        },
        include: {
            booking: {
                select: {
                    bookingNumber: true,
                    guest: { select: { name: true } },
                },
            },
            items: {
                orderBy: { serviceDate: 'asc' },
            },
        },
    });

    return invoices.map(invoice => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        bookingNumber: invoice.booking.bookingNumber,
        guestName: invoice.booking.guest.name,
        invoiceDate: invoice.issuedAt,
        placeOfSupply: invoice.placeOfSupply || '',
        isInterstate: invoice.isInterstate,
        subtotal: Number(invoice.subtotal),
        cgst: Number(invoice.cgst),
        sgst: Number(invoice.sgst),
        igst: Number(invoice.igst),
        taxAmount: Number(invoice.taxAmount),
        totalAmount: Number(invoice.totalAmount),
        items: invoice.items.map(item => ({
            description: item.description,
            hsnCode: item.hsnCode,
            taxableAmount: Number(item.amount),
            taxRate: Number(item.taxRate),
            cgst: Number(item.cgst),
            sgst: Number(item.sgst),
            igst: Number(item.igst),
            taxAmount: Number(item.taxAmount),
            totalAmount: Number(item.totalAmount),
        })),
    }));
}

/**
 * Calculate total tax liability for a date range
 */
export async function calculateTaxLiability(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<TaxLiability> {
    const taxSummary = await getTaxSummary(propertyId, startDate, endDate);

    // Calculate TCS (Tax Collected at Source) - hotels usually don't collect TCS
    // But there might be TCS on payments from foreign guests
    const tcsLiability = 0;

    // Input tax credit (would need integration with purchase invoices)
    const inputTaxCredit = 0;

    // Net tax liability
    const netTaxLiability = taxSummary.totalTax - inputTaxCredit;

    // Due date is 20th of next month (for monthly filers)
    const endDateObj = new Date(endDate);
    const dueDate = new Date(endDateObj.getFullYear(), endDateObj.getMonth() + 1, 20);

    // Determine filing status
    const today = new Date();
    let filingStatus: TaxLiability['filingStatus'] = 'PENDING';
    if (today > dueDate) {
        filingStatus = 'OVERDUE';
    }

    return {
        propertyId,
        startDate: taxSummary.startDate,
        endDate: taxSummary.endDate,
        totalRevenue: taxSummary.totalRevenue,
        totalTaxCollected: taxSummary.totalTax,
        totalTaxPayable: taxSummary.totalTax,
        inputTaxCredit,
        netTaxLiability,
        tcsLiability,
        filingStatus,
        dueDate,
    };
}
