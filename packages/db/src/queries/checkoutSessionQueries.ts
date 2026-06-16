// packages/db/src/queries/checkoutSessionQueries.ts
// Query helpers for CheckoutSession model (Express Checkout)

import prisma from '../index';
import { Prisma, CheckoutSessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { generateInvoiceNumber } from './invoiceQueries';

// ─── Types ───────────────────────────────────────────────────────────────────

export type InitiateCheckoutData = {
    bookingId: string;
};

export type UpdateCheckoutStatusData = {
    status: CheckoutSessionStatus;
};

export type CompleteCheckoutData = {
    totalCharges: number;
    totalPayments: number;
    pendingDues: number;
};

// ─── Initiate Express Checkout ───────────────────────────────────────────────

/**
 * Initiate an express checkout session for a booking
 */
export async function initiateExpressCheckout(data: InitiateCheckoutData) {
    const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        include: {
            guest: true,
            room: true,
            payments: true,
            folio: {
                include: {
                    charges: true,
                    payments: true,
                },
            },
        },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.status !== 'CHECKED_IN') {
        throw new Error('Can only initiate express checkout for checked-in bookings');
    }

    // Check if there's already an active session
    const existingSession = await prisma.checkoutSession.findFirst({
        where: {
            bookingId: data.bookingId,
            status: { in: ['INITIATED', 'IN_PROGRESS'] },
        },
    });

    if (existingSession) {
        throw new Error('There is already an active checkout session for this booking');
    }

    // Calculate current charges and payments from folio
    let totalCharges = 0;
    let totalPayments = 0;

    if (booking.folio) {
        for (const charge of booking.folio.charges) {
            totalCharges += charge.amount.toNumber();
        }
        for (const payment of booking.folio.payments) {
            totalPayments += payment.amount.toNumber();
        }
    }

    // Also include base amount and extras from booking
    totalCharges += booking.baseAmount.toNumber();
    totalCharges += booking.extrasAmount.toNumber();
    totalCharges -= booking.discountAmount.toNumber();

    const pendingDues = Math.max(0, totalCharges - totalPayments);

    return prisma.checkoutSession.create({
        data: {
            bookingId: data.bookingId,
            status: 'INITIATED',
            totalCharges: new Decimal(totalCharges),
            totalPayments: new Decimal(totalPayments),
            pendingDues: new Decimal(pendingDues),
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

// ─── Update Checkout Session Status ─────────────────────────────────────────

/**
 * Update the status of a checkout session
 */
export async function updateCheckoutSessionStatus(
    id: string,
    data: UpdateCheckoutStatusData
) {
    const session = await prisma.checkoutSession.findUnique({
        where: { id },
    });

    if (!session) {
        throw new Error('Checkout session not found');
    }

    if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
        throw new Error(`Cannot update session with status: ${session.status}`);
    }

    return prisma.checkoutSession.update({
        where: { id },
        data: {
            status: data.status,
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

// ─── Complete Express Checkout ───────────────────────────────────────────────

/**
 * Complete express checkout and generate invoice
 */
export async function completeExpressCheckout(
    id: string,
    data: CompleteCheckoutData
) {
    const session = await prisma.checkoutSession.findUnique({
        where: { id },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                    folio: {
                        include: {
                            charges: true,
                        },
                    },
                },
            },
        },
    });

    if (!session) {
        throw new Error('Checkout session not found');
    }

    if (session.status === 'COMPLETED') {
        throw new Error('Checkout session is already completed');
    }

    if (session.status === 'CANCELLED') {
        throw new Error('Cannot complete a cancelled checkout session');
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice
    const invoice = await prisma.invoice.create({
        data: {
            bookingId: session.bookingId,
            invoiceNumber,
            status: 'ISSUED',
            subtotal: new Decimal(data.totalCharges),
            totalAmount: new Decimal(data.totalCharges - data.totalPayments),
            taxAmount: new Decimal(0),
        },
    });

    // Update session with completion data
    const updatedSession = await prisma.checkoutSession.update({
        where: { id },
        data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            totalCharges: new Decimal(data.totalCharges),
            totalPayments: new Decimal(data.totalPayments),
            pendingDues: new Decimal(data.pendingDues),
            invoiceId: invoice.id,
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

    // Update booking status to CHECKED_OUT
    await prisma.booking.update({
        where: { id: session.bookingId },
        data: {
            status: 'CHECKED_OUT',
            checkoutType: 'EXPRESS',
            pendingDues: new Decimal(data.pendingDues),
        },
    });

    // Update room status to VACANT
    await prisma.room.update({
        where: { id: session.booking.roomId },
        data: {
            status: 'VACANT',
        },
    });

    return {
        session: updatedSession,
        invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
        },
    };
}

// ─── Get Checkout Session By Booking ─────────────────────────────────────────

/**
 * Get checkout session for a booking
 */
export async function getCheckoutSessionByBooking(bookingId: string) {
    return prisma.checkoutSession.findUnique({
        where: { bookingId },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                    folio: {
                        include: {
                            charges: true,
                            payments: true,
                        },
                    },
                },
            },
        },
    });
}

// ─── Get Checkout Session By ID ───────────────────────────────────────────────

/**
 * Get checkout session by ID
 */
export async function getCheckoutSessionById(id: string) {
    return prisma.checkoutSession.findUnique({
        where: { id },
        include: {
            booking: {
                include: {
                    guest: true,
                    room: true,
                    folio: {
                        include: {
                            charges: true,
                            payments: true,
                        },
                    },
                },
            },
        },
    });
}

// ─── Cancel Checkout Session ─────────────────────────────────────────────────

/**
 * Cancel a checkout session
 */
export async function cancelCheckoutSession(id: string) {
    const session = await prisma.checkoutSession.findUnique({
        where: { id },
    });

    if (!session) {
        throw new Error('Checkout session not found');
    }

    if (session.status === 'COMPLETED') {
        throw new Error('Cannot cancel a completed checkout session');
    }

    return prisma.checkoutSession.update({
        where: { id },
        data: {
            status: 'CANCELLED',
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

// ─── Get Active Checkout Sessions ────────────────────────────────────────────

/**
 * Get all active checkout sessions
 */
export async function getActiveCheckoutSessions(options?: {
    limit?: number;
    offset?: number;
}) {
    const { limit = 50, offset = 0 } = options || {};

    const [sessions, total] = await Promise.all([
        prisma.checkoutSession.findMany({
            where: {
                status: { in: ['INITIATED', 'IN_PROGRESS'] },
            },
            include: {
                booking: {
                    include: {
                        guest: true,
                        room: true,
                    },
                },
            },
            orderBy: { initiatedAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.checkoutSession.count({
            where: {
                status: { in: ['INITIATED', 'IN_PROGRESS'] },
            },
        }),
    ]);

    return {
        sessions,
        total,
        hasMore: offset + sessions.length < total,
    };
}
