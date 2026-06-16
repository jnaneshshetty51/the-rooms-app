// apps/front-office/src/app/api/email/payment/[id]/confirmation/route.ts
// Send Payment Confirmation Email

import { NextRequest, NextResponse } from 'next/server';
import { ok, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import { sendPaymentConfirmationEmail } from '@the-rooms/db/queries/emailAutomationQueries';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Verify payment exists
        const payment = await db.payment.findUnique({
            where: { id },
            include: {
                booking: {
                    include: { guest: true },
                },
            },
        });

        if (!payment) {
            return ok({ success: false, message: 'Payment not found' });
        }

        if (!payment.booking.guest.email) {
            return ok({ success: false, message: 'Guest email not found' });
        }

        const result = await sendPaymentConfirmationEmail(id);

        return ok({
            success: true,
            paymentId: id,
            bookingId: payment.bookingId,
            email: result.email,
            emailId: result.emailId,
            sentAt: result.sentAt,
        });
    } catch (error) {
        console.error('Error sending payment confirmation email:', error);
        return serverError('Failed to send payment confirmation email');
    }
}
