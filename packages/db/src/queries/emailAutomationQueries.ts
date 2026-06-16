// packages/db/src/queries/emailAutomationQueries.ts
// Email Automation for Confirmations Queries

import prisma from '../index';
import {
    sendBookingConfirmation,
    sendCheckInReminder,
    sendCheckOutReminder,
    sendPaymentSuccess,
    sendRefundNotification,
} from '../../../email/index';

// ── Booking Confirmation Email ────────────────────────────────────────────────

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmationEmail(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { guest: true, room: true },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (!booking.guest.email) {
        throw new Error('Guest email not found');
    }

    const result = await sendBookingConfirmation({
        to: booking.guest.email,
        guestName: booking.guest.name,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        roomNumber: booking.room.roomNumber,
        roomType: booking.room.type,
        checkIn: booking.checkIn.toISOString().split('T')[0],
        checkOut: booking.checkOut.toISOString().split('T')[0],
        guestsCount: booking.guestsCount,
        totalAmount: Number(booking.totalAmount),
        paymentMethod: 'Online',
        hotelAddress: 'The Rooms, 103/2, Uniworld, Neeladri Road, Behind Karnataka Bank, Electronic City Phase 1, Bangalore, Karnataka 560100',
        hotelPhone: '+91 73490 47799',
        hotelEmail: 'hello@therooms.in',
    });

    return {
        bookingId,
        email: booking.guest.email,
        emailId: result.id,
        sentAt: new Date(),
    };
}

// ── Check-in Reminder Email ───────────────────────────────────────────────────

/**
 * Send check-in reminder email (24h before)
 */
export async function sendCheckInReminderEmail(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { guest: true, room: true },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (!booking.guest.email) {
        throw new Error('Guest email not found');
    }

    const result = await sendCheckInReminder({
        to: booking.guest.email,
        guestName: booking.guest.name,
        bookingNumber: booking.bookingNumber,
        roomNumber: booking.room.roomNumber,
        checkIn: booking.checkIn.toISOString().split('T')[0],
        checkInTime: '2:00 PM',
    });

    return {
        bookingId,
        email: booking.guest.email,
        emailId: result.id,
        sentAt: new Date(),
    };
}

// ── Check-out Reminder Email ──────────────────────────────────────────────────

/**
 * Send check-out reminder email (24h before)
 */
export async function sendCheckOutReminderEmail(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { guest: true, room: true },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (!booking.guest.email) {
        throw new Error('Guest email not found');
    }

    const result = await sendCheckOutReminder({
        to: booking.guest.email,
        guestName: booking.guest.name,
        bookingNumber: booking.bookingNumber,
        roomNumber: booking.room.roomNumber,
        checkOut: booking.checkOut.toISOString().split('T')[0],
        checkOutTime: '11:00 AM',
    });

    return {
        bookingId,
        email: booking.guest.email,
        emailId: result.id,
        sentAt: new Date(),
    };
}

// ── Payment Confirmation Email ────────────────────────────────────────────────

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(paymentId: string) {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
            booking: {
                include: { guest: true, room: true },
            },
        },
    });

    if (!payment) {
        throw new Error('Payment not found');
    }

    if (!payment.booking.guest.email) {
        throw new Error('Guest email not found');
    }

    const result = await sendPaymentSuccess({
        to: payment.booking.guest.email,
        guestName: payment.booking.guest.name,
        bookingNumber: payment.booking.bookingNumber,
        roomType: payment.booking.room.type,
        roomNumber: payment.booking.room.roomNumber,
        amount: Number(payment.amount),
        transactionId: payment.transactionId || payment.id,
        paymentMethod: payment.method,
        checkIn: payment.booking.checkIn.toISOString().split('T')[0],
        checkOut: payment.booking.checkOut.toISOString().split('T')[0],
    });

    return {
        paymentId,
        bookingId: payment.bookingId,
        email: payment.booking.guest.email,
        emailId: result.id,
        sentAt: new Date(),
    };
}

// ── Cancellation Confirmation Email ───────────────────────────────────────────

/**
 * Send cancellation confirmation email
 */
export async function sendCancellationConfirmationEmail(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { guest: true },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (!booking.guest.email) {
        throw new Error('Guest email not found');
    }

    const result = await sendRefundNotification(
        booking.guest.email,
        booking.bookingNumber,
        Number(booking.totalAmount),
        booking.guest.name
    );

    return {
        bookingId,
        email: booking.guest.email,
        emailId: result.id,
        sentAt: new Date(),
        type: 'CANCELLATION',
    };
}

// ── Modification Confirmation Email ───────────────────────────────────────────

/**
 * Send modification confirmation email
 */
export async function sendModificationConfirmationEmail(
    bookingId: string,
    modificationType: string
) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { guest: true, room: true },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (!booking.guest.email) {
        throw new Error('Guest email not found');
    }

    // Send a booking confirmation email as a modification notification
    const result = await sendBookingConfirmation({
        to: booking.guest.email,
        guestName: booking.guest.name,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        roomNumber: booking.room.roomNumber,
        roomType: booking.room.type,
        checkIn: booking.checkIn.toISOString().split('T')[0],
        checkOut: booking.checkOut.toISOString().split('T')[0],
        guestsCount: booking.guestsCount,
        totalAmount: Number(booking.totalAmount),
        paymentMethod: 'Online',
        hotelAddress: 'The Rooms, 103/2, Uniworld, Neeladri Road, Behind Karnataka Bank, Electronic City Phase 1, Bangalore, Karnataka 560100',
        hotelPhone: '+91 73490 47799',
        hotelEmail: 'hello@therooms.in',
    });

    return {
        bookingId,
        email: booking.guest.email,
        emailId: result.id,
        sentAt: new Date(),
        type: 'MODIFICATION',
        modificationType,
    };
}

// ── Scheduled Email Management ────────────────────────────────────────────────

/**
 * Schedule automated emails for a booking
 * This creates entries in the NotificationLog table for scheduled sending
 */
export async function scheduleAutomatedEmails(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { guest: true },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    const scheduledEmails = [];

    // Schedule booking confirmation (immediate)
    scheduledEmails.push({
        channel: 'EMAIL' as const,
        recipient: booking.guest.email || '',
        templateId: null,
        subject: `Booking Confirmed - ${booking.bookingNumber}`,
        body: `Dear ${booking.guest.name}, your booking ${booking.bookingNumber} is confirmed.`,
        entityType: 'booking',
        entityId: bookingId,
        status: 'PENDING' as const,
        scheduledAt: new Date(),
    });

    // Schedule check-in reminder (24h before check-in)
    const checkInReminderTime = new Date(booking.checkIn);
    checkInReminderTime.setHours(checkInReminderTime.getHours() - 24);

    if (checkInReminderTime > new Date()) {
        scheduledEmails.push({
            channel: 'EMAIL' as const,
            recipient: booking.guest.email || '',
            templateId: null,
            subject: `Check-in Reminder - ${booking.bookingNumber}`,
            body: `Dear ${booking.guest.name}, your check-in is tomorrow.`,
            entityType: 'booking',
            entityId: bookingId,
            status: 'PENDING' as const,
            scheduledAt: checkInReminderTime,
        });
    }

    // Schedule check-out reminder (24h before check-out)
    const checkOutReminderTime = new Date(booking.checkOut);
    checkOutReminderTime.setHours(checkOutReminderTime.getHours() - 24);

    if (checkOutReminderTime > new Date()) {
        scheduledEmails.push({
            channel: 'EMAIL' as const,
            recipient: booking.guest.email || '',
            templateId: null,
            subject: `Check-out Reminder - ${booking.bookingNumber}`,
            body: `Dear ${booking.guest.name}, your check-out is tomorrow.`,
            entityType: 'booking',
            entityId: bookingId,
            status: 'PENDING' as const,
            scheduledAt: checkOutReminderTime,
        });
    }

    // Create all scheduled emails
    const createdEmails = await prisma.notificationLog.createMany({
        data: scheduledEmails,
    });

    return {
        bookingId,
        emailsScheduled: createdEmails.count,
        scheduledEmails: scheduledEmails.map((e) => ({
            type: e.subject.includes('Confirmed') ? 'CONFIRMATION' :
                e.subject.includes('Check-in') ? 'CHECK_IN_REMINDER' : 'CHECK_OUT_REMINDER',
            scheduledAt: e.scheduledAt,
        })),
    };
}

/**
 * Cancel scheduled emails for a booking
 */
export async function cancelScheduledEmails(bookingId: string) {
    const result = await prisma.notificationLog.updateMany({
        where: {
            entityType: 'booking',
            entityId: bookingId,
            status: 'PENDING',
        },
        data: {
            status: 'FAILED',
        },
    });

    return {
        bookingId,
        emailsCancelled: result.count,
    };
}

/**
 * Get scheduled emails for a booking
 */
export async function getScheduledEmails(bookingId: string) {
    return prisma.notificationLog.findMany({
        where: {
            entityType: 'booking',
            entityId: bookingId,
        },
        orderBy: { scheduledAt: 'asc' },
    });
}
