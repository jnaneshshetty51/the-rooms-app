// apps/guest-portal/src/app/api/bookings/[id]/express-checkout/status/route.ts
// GET /api/bookings/[id]/express-checkout/status - Get checkout session status

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { prisma } from '@the-rooms/db';
import { getCheckoutSessionByBooking } from '@the-rooms/db/queries/checkoutSessionQueries';

// ─── GET /api/bookings/[id]/express-checkout/status ───────────────────────────
// Get checkout session status for a booking

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Get guest by email to verify ownership
        const guest = await prisma.guest.findFirst({
            where: { email: session.user.email },
        });

        if (!guest) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
        }

        // Check if booking exists and belongs to this guest
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: {
                guest: true,
                room: true,
            },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        if (booking.guestId !== guest.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get the checkout session
        const checkoutSession = await getCheckoutSessionByBooking(id);

        if (!checkoutSession) {
            return NextResponse.json({
                hasSession: false,
                booking: {
                    id: booking.id,
                    bookingNumber: booking.bookingNumber,
                    status: booking.status,
                    checkOut: booking.checkOut,
                },
            });
        }

        return NextResponse.json({
            hasSession: true,
            session: {
                id: checkoutSession.id,
                status: checkoutSession.status,
                initiatedAt: checkoutSession.initiatedAt,
                completedAt: checkoutSession.completedAt,
                totalCharges: checkoutSession.totalCharges,
                totalPayments: checkoutSession.totalPayments,
                pendingDues: checkoutSession.pendingDues,
                invoiceId: checkoutSession.invoiceId,
            },
            booking: {
                id: booking.id,
                bookingNumber: booking.bookingNumber,
                status: booking.status,
                checkOut: booking.checkOut,
            },
        });
    } catch (error) {
        console.error('[EXPRESS_CHECKOUT_STATUS]', error);
        return NextResponse.json(
            { error: 'Failed to get checkout status' },
            { status: 500 }
        );
    }
}
