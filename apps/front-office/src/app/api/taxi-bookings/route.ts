// apps/front-office/src/app/api/taxi-bookings/route.ts
// Taxi Booking API - List and Create

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, created, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { getTaxiBookings, createTaxiBooking, getTodaysTaxiBookings } from '@the-rooms/db/queries/taxiBookingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createTaxiBookingSchema = z.object({
    bookingId: z.string().optional(),
    roomNumber: z.string().min(1, 'Room number is required'),
    guestName: z.string().min(1, 'Guest name is required'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    pickupLocation: z.string().min(1, 'Pickup location is required'),
    dropoffLocation: z.string().min(1, 'Drop-off location is required'),
    pickupDateTime: z.string().datetime({ message: 'Invalid pickup date/time' }),
    vehicleType: z.enum(['SEDAN', 'SUV', 'LUXURY', 'VAN', 'AUTO']),
    numberOfPassengers: z.number().int().positive().optional().default(1),
    fare: z.number().positive().optional(),
    notes: z.string().optional(),
});

const listTaxiBookingsSchema = z.object({
    status: z.enum(['REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    bookingId: z.string().optional(),
    roomNumber: z.string().optional(),
    date: z.string().optional(), // YYYY-MM-DD format
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.coerce.number().optional().default(1),
    pageSize: z.coerce.number().optional().default(20),
});

// ─── GET /api/taxi-bookings ────────────────────────────────────────────────────────
// List taxi bookings with filters

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { searchParams } = new URL(request.url);
        const params = Object.fromEntries(searchParams.entries());

        // Special case: if date=today, return today's bookings
        if (params.date === 'today') {
            const bookings = await getTodaysTaxiBookings();
            return ok({ bookings, pagination: { page: 1, pageSize: 100, total: bookings.length, pages: 1 } });
        }

        const parsed = listTaxiBookingsSchema.safeParse(params);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { status, bookingId, roomNumber, date, startDate, endDate, page, pageSize } = parsed.data;

        const result = await getTaxiBookings({
            status,
            bookingId,
            roomNumber,
            date: date ? new Date(date) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page,
            pageSize,
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
        console.error('[TAXI_BOOKINGS_LIST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/taxi-bookings ─────────────────────────────────────────────────────
// Create a new taxi booking

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        await requireStaff(session);

        const body = await request.json();
        const parsed = createTaxiBookingSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { bookingId, roomNumber, guestName, phoneNumber, pickupLocation, dropoffLocation, pickupDateTime, vehicleType, numberOfPassengers, fare, notes } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // If bookingId is provided, verify the booking exists and is active
        if (bookingId) {
            const booking = await db.booking.findUnique({
                where: { id: bookingId },
            });
            if (!booking) {
                return badRequest('Booking not found', 'BOOKING_NOT_FOUND');
            }
            if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
                return badRequest('Taxi bookings can only be created for active bookings', 'INVALID_BOOKING_STATUS');
            }
        }

        const booking = await createTaxiBooking({
            bookingId,
            roomNumber,
            guestName,
            phoneNumber,
            pickupLocation,
            dropoffLocation,
            pickupDateTime: new Date(pickupDateTime),
            vehicleType,
            numberOfPassengers,
            fare,
            notes,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: bookingId || undefined,
            action: 'CREATE',
            entity: 'taxiBooking',
            entityId: booking.id,
            metadata: {
                roomNumber,
                guestName,
                pickupLocation,
                dropoffLocation,
                pickupDateTime,
                vehicleType,
            },
            ipAddress: getClientIp(request),
        });

        return created(booking, 'Taxi booking created successfully');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[TAXI_BOOKINGS_CREATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
