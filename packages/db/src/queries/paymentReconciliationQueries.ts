import prisma from '../index';
import { Prisma, PaymentStatus } from '@prisma/client';

/**
 * ─── Payment Reconciliation Queries ────────────────────────────────────────
 *
 * Functions for:
 * - Scenario 62: Payment reconciliation report
 */

// ─── Payment Reconciliation (Scenario 62) ────────────────────────────────────

export interface PaymentReconciliation {
    date: Date;
    propertyId: string;
    expectedAmount: number;
    receivedAmount: number;
    pendingAmount: number;
    refundedAmount: number;
    discrepancyAmount: number;
    bookings: Array<{
        bookingId: string;
        bookingNumber: string;
        guestName: string;
        expectedAmount: number;
        receivedAmount: number;
        pendingAmount: number;
        status: string;
    }>;
}

export interface ExpectedPayment {
    bookingId: string;
    bookingNumber: string;
    guestName: string;
    roomNumber: string;
    checkOut: Date;
    expectedAmount: number;
    paidAmount: number;
    pendingAmount: number;
    status: PaymentStatus;
}

export interface PaymentDiscrepancy {
    bookingId: string;
    bookingNumber: string;
    guestName: string;
    expectedAmount: number;
    receivedAmount: number;
    discrepancy: number;
    discrepancyType: 'UNDERPAYMENT' | 'OVERPAYMENT' | 'MISSING_PAYMENT';
    notes?: string;
}

export interface OutstandingPayment {
    bookingId: string;
    bookingNumber: string;
    guestName: string;
    guestPhone: string;
    roomNumber: string;
    checkOut: Date;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    daysOverdue: number;
    source: string;
}

/**
 * Get daily payment reconciliation
 */
export async function getPaymentReconciliation(
    propertyId: string,
    date: Date
): Promise<PaymentReconciliation> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all bookings with expected payments for this date
    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            checkOut: { gte: startOfDay, lte: endOfDay },
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
        include: {
            guest: { select: { name: true } },
            room: { select: { roomNumber: true } },
            payments: true,
            invoice: true,
        },
    });

    let expectedAmount = 0;
    let receivedAmount = 0;
    let pendingAmount = 0;
    let refundedAmount = 0;

    const bookingDetails: PaymentReconciliation['bookings'] = [];

    for (const booking of bookings) {
        const bookingExpected = Number(booking.totalAmount);
        const bookingPaid = booking.payments
            .filter(p => p.status === 'PAID')
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const bookingRefunded = booking.payments
            .filter(p => p.status === 'REFUNDED')
            .reduce((sum, p) => sum + Number(p.refundAmount || 0), 0);

        expectedAmount += bookingExpected;
        receivedAmount += bookingPaid;
        pendingAmount += bookingExpected - bookingPaid;
        refundedAmount += bookingRefunded;

        bookingDetails.push({
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            guestName: booking.guest.name,
            expectedAmount: bookingExpected,
            receivedAmount: bookingPaid,
            pendingAmount: bookingExpected - bookingPaid,
            status: booking.paymentStatus,
        });
    }

    return {
        date: startOfDay,
        propertyId,
        expectedAmount,
        receivedAmount,
        pendingAmount,
        refundedAmount,
        discrepancyAmount: expectedAmount - receivedAmount,
        bookings: bookingDetails,
    };
}

/**
 * Get expected vs received payments for a date range
 */
export async function getExpectedPayments(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<ExpectedPayment[]> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            checkOut: { gte: startOfDay, lte: endOfDay },
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
        include: {
            guest: { select: { name: true } },
            room: { select: { roomNumber: true } },
            payments: {
                where: { status: 'PAID' },
            },
        },
    });

    return bookings.map(b => {
        const paidAmount = b.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const expectedAmount = Number(b.totalAmount);

        return {
            bookingId: b.id,
            bookingNumber: b.bookingNumber,
            guestName: b.guest.name,
            roomNumber: b.room.roomNumber,
            checkOut: b.checkOut,
            expectedAmount,
            paidAmount,
            pendingAmount: expectedAmount - paidAmount,
            status: b.paymentStatus,
        };
    });
}

/**
 * Get payment discrepancies for a date range
 */
export async function getPaymentDiscrepancies(
    propertyId: string,
    startDate: Date,
    endDate: Date
): Promise<PaymentDiscrepancy[]> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            checkOut: { gte: startOfDay, lte: endOfDay },
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
        include: {
            guest: { select: { name: true } },
            payments: {
                where: { status: 'PAID' },
            },
        },
    });

    const discrepancies: PaymentDiscrepancy[] = [];

    for (const booking of bookings) {
        const expectedAmount = Number(booking.totalAmount);
        const receivedAmount = booking.payments.reduce(
            (sum, p) => sum + Number(p.amount), 0
        );
        const discrepancy = expectedAmount - receivedAmount;

        // Only include if there's a meaningful discrepancy
        if (Math.abs(discrepancy) > 1) { // More than Rs 1 difference
            let discrepancyType: PaymentDiscrepancy['discrepancyType'];
            if (receivedAmount === 0 && expectedAmount > 0) {
                discrepancyType = 'MISSING_PAYMENT';
            } else if (discrepancy > 0) {
                discrepancyType = 'UNDERPAYMENT';
            } else {
                discrepancyType = 'OVERPAYMENT';
            }

            discrepancies.push({
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                guestName: booking.guest.name,
                expectedAmount,
                receivedAmount,
                discrepancy,
                discrepancyType,
            });
        }
    }

    return discrepancies;
}

/**
 * Get outstanding payments (unpaid invoices/booking balances)
 */
export async function getOutstandingPayments(
    propertyId: string
): Promise<OutstandingPayment[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Get bookings with pending or partial payments that have checked out
    const bookings = await prisma.booking.findMany({
        where: {
            propertyId,
            checkOut: { lte: today },
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
            paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        },
        include: {
            guest: { select: { name: true, phone: true } },
            room: { select: { roomNumber: true } },
            payments: {
                where: { status: 'PAID' },
            },
        },
    });

    return bookings.map(b => {
        const paidAmount = b.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalAmount = Number(b.totalAmount);
        const pendingAmount = totalAmount - paidAmount;

        // Calculate days overdue (since checkout)
        const daysOverdue = Math.max(0,
            Math.floor((today.getTime() - b.checkOut.getTime()) / (1000 * 60 * 60 * 24))
        );

        return {
            bookingId: b.id,
            bookingNumber: b.bookingNumber,
            guestName: b.guest.name,
            guestPhone: b.guest.phone,
            roomNumber: b.room.roomNumber,
            checkOut: b.checkOut,
            totalAmount,
            paidAmount,
            pendingAmount,
            daysOverdue,
            source: b.bookingSource,
        };
    }).filter(b => b.pendingAmount > 0)
        .sort((a, b) => b.daysOverdue - a.daysOverdue);
}
