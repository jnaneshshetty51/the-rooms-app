// apps/front-office/src/app/api/bookings/[id]/extend/route.ts
// Extend Stay API for a booking

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, created, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { createStayExtensionRequest, getPendingExtensionByBookingId, approveStayExtension, rejectStayExtension, checkRoomAvailabilityForExtension, getExtensionHistory } from '@the-rooms/db/queries/stayExtensionQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const extendStaySchema = z.object({
    requestedNights: z.number().int().positive('Must request at least 1 night'),
    newCheckOut: z.string().datetime({ message: 'Invalid new check-out date' }),
    reason: z.string().optional(),
    notes: z.string().optional(),
});

const approveExtensionSchema = z.object({
    extraChargeAmount: z.number().optional(),
    chargeDescription: z.string().optional(),
    keepSameRoom: z.boolean().optional().default(true),
});

const rejectExtensionSchema = z.object({
    rejectionReason: z.string().optional(),
});

// ─── POST /api/bookings/[id]/extend ─────────────────────────────────────────────
// Create a stay extension request

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = extendStaySchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { requestedNights, newCheckOut, reason, notes } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id },
            include: { room: true },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
            return badRequest('Can only extend stays for confirmed or checked-in bookings', 'INVALID_STATUS');
        }

        // Check if there's already a pending extension request
        const pending = await getPendingExtensionByBookingId(id);
        if (pending) {
            return badRequest('There is already a pending extension request for this booking', 'PENDING_EXISTS');
        }

        // Check room availability for the extension
        const availability = await checkRoomAvailabilityForExtension(id, new Date(newCheckOut));

        // Create the extension request
        const extensionRequest = await createStayExtensionRequest({
            bookingId: id,
            requestedNights,
            newCheckOut: new Date(newCheckOut),
            reason,
            notes,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: 'EXTEND_STAY_REQUESTED',
            entity: 'booking',
            entityId: id,
            metadata: {
                requestedNights,
                newCheckOut,
                sameRoomAvailable: availability.sameRoom,
                estimatedCharge: extensionRequest.extraChargeAmount?.toNumber(),
            },
            ipAddress: getClientIp(request),
        });

        return created(extensionRequest, 'Stay extension request created successfully');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[EXTEND_STAY_REQUEST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── GET /api/bookings/[id]/extend ─────────────────────────────────────────────
// Get extension status/history for a booking

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

        // Get pending request if any
        const pending = await getPendingExtensionByBookingId(id);

        // Get extension history
        const history = await getExtensionHistory(id);

        return ok({
            pendingRequest: pending,
            history,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[EXTEND_STAY_STATUS]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
