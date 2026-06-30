// apps/guest-portal/src/app/api/bookings/[id]/express-checkout/complete/route.ts
// POST /api/bookings/[id]/express-checkout/complete - Complete express checkout

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { prisma } from '@the-rooms/db';
import { z } from 'zod';
import { completeExpressCheckout, getCheckoutSessionByBooking } from '@the-rooms/db/queries/checkoutSessionQueries';

// ─── Schemas ───────────────────────────────────────────────────────────────────

const completeCheckoutSchema = z.object({
    totalCharges: z.number().min(0, 'Total charges must be non-negative'),
    totalPayments: z.number().min(0, 'Total payments must be non-negative'),
    pendingDues: z.number().min(0, 'Pending dues must be non-negative'),
});

// ─── POST /api/bookings/[id]/express-checkout/complete ─────────────────────────
// Complete express checkout for a booking

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const userId = (session.user as { id?: string }).id;

        if (!session.user.email) {
            return NextResponse.json({ error: 'Guest email not found in session' }, { status: 400 });
        }

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
            return NextResponse.json(
                { error: 'No checkout session found. Please initiate checkout first.' },
                { status: 400 }
            );
        }

        if (checkoutSession.status === 'COMPLETED') {
            return NextResponse.json(
                { error: 'Checkout is already completed' },
                { status: 400 }
            );
        }

        if (checkoutSession.status === 'CANCELLED') {
            return NextResponse.json(
                { error: 'Checkout session was cancelled' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const parsed = completeCheckoutSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors.map(e => e.message).join(', ') },
                { status: 400 }
            );
        }

        const { totalCharges, totalPayments, pendingDues } = parsed.data;

        const result = await completeExpressCheckout(checkoutSession.id, {
            totalCharges,
            totalPayments,
            pendingDues,
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                bookingId: id,
                action: 'EXPRESS_CHECKOUT_COMPLETED',
                entity: 'checkoutSession',
                entityId: checkoutSession.id,
                metadata: {
                    totalCharges,
                    totalPayments,
                    pendingDues,
                    invoiceId: result.invoice.id,
                    invoiceNumber: result.invoice.invoiceNumber,
                },
            },
        });

        return NextResponse.json({
            message: 'Express checkout completed successfully',
            session: {
                id: result.session.id,
                status: result.session.status,
                completedAt: result.session.completedAt,
                pendingDues: result.session.pendingDues,
            },
            invoice: result.invoice,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message.includes('already completed')) {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        if (message.includes('cancelled')) {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        console.error('[EXPRESS_CHECKOUT_COMPLETE]', error);
        return NextResponse.json(
            { error: 'Failed to complete express checkout' },
            { status: 500 }
        );
    }
}
