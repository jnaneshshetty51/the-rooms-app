// apps/front-office/src/app/api/email/booking/[id]/confirmation/route.ts
// Send Booking Confirmation Email

import { NextRequest, NextResponse } from 'next/server';
import { ok, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import { sendBookingConfirmationEmail } from '@the-rooms/db/queries/emailAutomationQueries';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Verify booking exists
        const booking = await db.booking.findUnique({
            where: { id },
            include: { guest: true },
        });

        if (!booking) {
            return ok({ success: false, message: 'Booking not found' });
        }

        if (!booking.guest.email) {
            return ok({ success: false, message: 'Guest email not found' });
        }

        const result = await sendBookingConfirmationEmail(id);

        return ok({
            success: true,
            bookingId: id,
            email: result.email,
            emailId: result.emailId,
            sentAt: result.sentAt,
        });
    } catch (error) {
        console.error('Error sending booking confirmation email:', error);
        return serverError('Failed to send booking confirmation email');
    }
}
