// apps/front-office/src/app/api/bookings/[id]/extra-bed/route.ts
// Extra Bed API for a booking

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { addExtraBed, removeExtraBed, getExtraBedInfo } from '@the-rooms/db/queries/extraBedQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const addExtraBedSchema = z.object({
    quantity: z.number().int().positive().optional().default(1),
    notes: z.string().optional(),
});

const removeExtraBedSchema = z.object({
    quantity: z.number().int().positive().optional().default(1),
});

// ─── GET /api/bookings/[id]/extra-bed ─────────────────────────────────────────────
// Get extra bed info for a booking

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        const extraBedInfo = await getExtraBedInfo(id);

        return ok(extraBedInfo);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[EXTRA_BED_INFO]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/bookings/[id]/extra-bed ─────────────────────────────────────────────
// Add extra bed(s) to a booking

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = addExtraBedSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { quantity, notes } = parsed.data;
        const userId = (session.user as { id: string }).id;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
            return badRequest('Can only add extra beds to confirmed or checked-in bookings', 'INVALID_STATUS');
        }

        const result = await addExtraBed({
            bookingId: id,
            quantity,
            notes,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: 'EXTRA_BED_ADDED',
            entity: 'booking',
            entityId: id,
            metadata: {
                quantity,
                chargeAmount: result.chargeAmount,
                extraBedPrice: result.extraBedPrice,
            },
            ipAddress: getClientIp(request),
        });

        return ok(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (message.includes('Cannot add')) {
            return badRequest(message, 'EXTRA_BED_LIMIT_EXCEEDED');
        }
        console.error('[EXTRA_BED_ADD]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── DELETE /api/bookings/[id]/extra-bed ─────────────────────────────────────────────
// Remove extra bed(s) from a booking

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const quantity = body.quantity || 1;
        const userId = (session.user as { id: string }).id;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        const result = await removeExtraBed({
            bookingId: id,
            quantity,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: 'EXTRA_BED_REMOVED',
            entity: 'booking',
            entityId: id,
            metadata: {
                quantity,
            },
            ipAddress: getClientIp(request),
        });

        return ok(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (message.includes('Cannot remove')) {
            return badRequest(message, 'EXTRA_BED_LIMIT_EXCEEDED');
        }
        console.error('[EXTRA_BED_REMOVE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
