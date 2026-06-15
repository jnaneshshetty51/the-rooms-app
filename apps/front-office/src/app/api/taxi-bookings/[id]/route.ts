// apps/front-office/src/app/api/taxi-bookings/[id]/route.ts
// Taxi Booking API - Single Item Operations

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { getTaxiBookingById, updateTaxiBooking, confirmTaxiBooking, startTaxiTrip, completeTaxiTrip, cancelTaxiBooking, deleteTaxiBooking } from '@the-rooms/db/queries/taxiBookingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const updateTaxiBookingSchema = z.object({
    pickupLocation: z.string().optional(),
    dropoffLocation: z.string().optional(),
    pickupDateTime: z.string().datetime().optional(),
    vehicleType: z.enum(['SEDAN', 'SUV', 'LUXURY', 'VAN', 'AUTO']).optional(),
    numberOfPassengers: z.number().int().positive().optional(),
    driverName: z.string().optional(),
    driverPhone: z.string().optional(),
    vehicleNumber: z.string().optional(),
    fare: z.number().positive().optional(),
    status: z.enum(['REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    notes: z.string().optional(),
});

const confirmTaxiBookingSchema = z.object({
    driverName: z.string().min(1, 'Driver name is required'),
    driverPhone: z.string().min(1, 'Driver phone is required'),
    vehicleNumber: z.string().min(1, 'Vehicle number is required'),
    fare: z.number().positive().optional(),
});

// ─── GET /api/taxi-bookings/[id] ───────────────────────────────────────────────────
// Get single taxi booking

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;

        const booking = await getTaxiBookingById(id);

        if (!booking) {
            return notFound('TaxiBooking', 'BOOKING_NOT_FOUND');
        }

        return ok(booking);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[TAXI_BOOKING_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/taxi-bookings/[id] ────────────────────────────────────────────────
// Update taxi booking

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateTaxiBookingSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id?: string }).id;

        // Check if booking exists
        const existing = await getTaxiBookingById(id);
        if (!existing) {
            return notFound('TaxiBooking', 'BOOKING_NOT_FOUND');
        }

        const { status, ...otherData } = parsed.data;

        // Handle status-specific updates
        if (status === 'CONFIRMED' && existing.status === 'REQUESTED') {
            // Need driver info to confirm
            return badRequest('Use confirm action to assign driver details', 'DRIVER_INFO_REQUIRED');
        } else if (status === 'IN_PROGRESS' && existing.status === 'CONFIRMED') {
            await startTaxiTrip(id);
        } else if (status === 'COMPLETED') {
            await completeTaxiTrip(id);
        } else if (status === 'CANCELLED') {
            await cancelTaxiBooking(id, otherData.notes);
        } else if (Object.keys(otherData).length > 0) {
            await updateTaxiBooking(id, {
                ...otherData,
                pickupDateTime: otherData.pickupDateTime ? new Date(otherData.pickupDateTime) : undefined,
            });
        }

        // Get updated booking
        const updated = await getTaxiBookingById(id);

        // Audit log
        await createAuditLog({
            userId,
            bookingId: existing.bookingId || undefined,
            action: 'UPDATE',
            entity: 'taxiBooking',
            entityId: id,
            metadata: {
                previousStatus: existing.status,
                newStatus: status || existing.status,
            },
            ipAddress: getClientIp(request),
        });

        return ok(updated);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[TAXI_BOOKING_UPDATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── DELETE /api/taxi-bookings/[id] ───────────────────────────────────────────────
// Delete a taxi booking (admin only)

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const userId = (session.user as { id?: string }).id;

        // Check if booking exists
        const existing = await getTaxiBookingById(id);
        if (!existing) {
            return notFound('TaxiBooking', 'BOOKING_NOT_FOUND');
        }

        // Don't allow deletion of active bookings
        if (['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'].includes(existing.status)) {
            return badRequest('Cannot delete an active taxi booking. Cancel it instead.', 'BOOKING_ACTIVE');
        }

        await deleteTaxiBooking(id);

        // Audit log
        await createAuditLog({
            userId,
            bookingId: existing.bookingId || undefined,
            action: 'DELETE',
            entity: 'taxiBooking',
            entityId: id,
            metadata: {
                roomNumber: existing.roomNumber,
                pickupDateTime: existing.pickupDateTime,
            },
            ipAddress: getClientIp(request),
        });

        return ok({ success: true });
    } catch (error) {
        console.error('[TAXI_BOOKING_DELETE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
