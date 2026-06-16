// apps/front-office/src/app/api/email/booking/[id]/schedule/route.ts
// Schedule Automated Emails for Booking

import { NextRequest, NextResponse } from 'next/server';
import { ok, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import { scheduleAutomatedEmails, cancelScheduledEmails, getScheduledEmails } from '@the-rooms/db/queries/emailAutomationQueries';

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

        const result = await scheduleAutomatedEmails(id);

        return ok({
            success: true,
            bookingId: id,
            emailsScheduled: result.emailsScheduled,
            scheduledEmails: result.scheduledEmails,
        });
    } catch (error) {
        console.error('Error scheduling automated emails:', error);
        return serverError('Failed to schedule automated emails');
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const scheduledEmails = await getScheduledEmails(id);

        return ok({
            bookingId: id,
            scheduledEmails,
        });
    } catch (error) {
        console.error('Error getting scheduled emails:', error);
        return serverError('Failed to get scheduled emails');
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const result = await cancelScheduledEmails(id);

        return ok({
            success: true,
            bookingId: id,
            emailsCancelled: result.emailsCancelled,
        });
    } catch (error) {
        console.error('Error cancelling scheduled emails:', error);
        return serverError('Failed to cancel scheduled emails');
    }
}
