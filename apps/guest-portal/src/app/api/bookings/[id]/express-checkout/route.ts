// apps/guest-portal/src/app/api/bookings/[id]/express-checkout/route.ts
// POST /api/bookings/[id]/express-checkout - Initiate express checkout

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { prisma } from '@the-rooms/db';
import { z } from 'zod';
import { initiateExpressCheckout } from '@the-rooms/db/queries/checkoutSessionQueries';

// ─── POST /api/bookings/[id]/express-checkout ─────────────────────────────────
// Initiate express checkout for a booking

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

        if (booking.status !== 'CHECKED_IN') {
            return NextResponse.json(
                { error: 'Can only initiate express checkout for checked-in bookings' },
                { status: 400 }
            );
        }

        const result = await initiateExpressCheckout({ bookingId: id });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                bookingId: id,
                action: 'EXPRESS_CHECKOUT_INITIATED',
                entity: 'checkoutSession',
                entityId: result.id,
                metadata: {
                    totalCharges: result.totalCharges?.toNumber(),
                    totalPayments: result.totalPayments?.toNumber(),
                    pendingDues: result.pendingDues?.toNumber(),
                },
            },
        });

        return NextResponse.json({
            session: {
                id: result.id,
                status: result.status,
                initiatedAt: result.initiatedAt,
                totalCharges: result.totalCharges,
                totalPayments: result.totalPayments,
                pendingDues: result.pendingDues,
            },
        }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message.includes('already an active')) {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        if (message.includes('not found')) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }
        console.error('[EXPRESS_CHECKOUT_INITIATE]', error);
        return NextResponse.json(
            { error: 'Failed to initiate express checkout' },
            { status: 500 }
        );
    }
}
