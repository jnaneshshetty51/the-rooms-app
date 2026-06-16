// apps/front-office/src/app/api/wakeup-calls/route.ts
// Wake-Up Call API - List and Create

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, created, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { getWakeUpCalls, createWakeUpCall, getTodaysWakeUpCalls } from '@the-rooms/db/queries/wakeUpCallQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createWakeUpCallSchema = z.object({
    bookingId: z.string().optional(),
    roomNumber: z.string().min(1, 'Room number is required'),
    guestName: z.string().min(1, 'Guest name is required'),
    phoneNumber: z.string().optional(),
    scheduledTime: z.string().datetime({ message: 'Invalid scheduled time' }),
    duration: z.number().int().positive().optional().default(60),
    notes: z.string().optional(),
});

const listWakeUpCallsSchema = z.object({
    status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED', 'MISSED']).optional(),
    bookingId: z.string().optional(),
    roomNumber: z.string().optional(),
    date: z.string().optional(), // YYYY-MM-DD format
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.coerce.number().optional().default(1),
    pageSize: z.coerce.number().optional().default(20),
});

// ─── GET /api/wakeup-calls ────────────────────────────────────────────────────────
// List wake-up calls with filters

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { searchParams } = new URL(request.url);
        const params = Object.fromEntries(searchParams.entries());

        // Special case: if date=today, return today's calls
        if (params.date === 'today') {
            const calls = await getTodaysWakeUpCalls();
            return ok({ calls, pagination: { page: 1, pageSize: 100, total: calls.length, pages: 1 } });
        }

        const parsed = listWakeUpCallsSchema.safeParse(params);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { status, bookingId, roomNumber, date, startDate, endDate, page, pageSize } = parsed.data;

        const result = await getWakeUpCalls({
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
        console.error('[WAKEUP_CALLS_LIST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/wakeup-calls ─────────────────────────────────────────────────────
// Schedule a new wake-up call

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        await requireStaff(session);

        const body = await request.json();
        const parsed = createWakeUpCallSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { bookingId, roomNumber, guestName, phoneNumber, scheduledTime, duration, notes } = parsed.data;
        const userId = (session.user as { id: string }).id;

        // If bookingId is provided, verify the booking exists and is active
        if (bookingId) {
            const booking = await db.booking.findUnique({
                where: { id: bookingId },
            });
            if (!booking) {
                return badRequest('Booking not found', 'BOOKING_NOT_FOUND');
            }
            if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
                return badRequest('Wake-up calls can only be scheduled for active bookings', 'INVALID_BOOKING_STATUS');
            }
        }

        // Check if scheduled time is in the future
        const scheduledDate = new Date(scheduledTime);
        if (scheduledDate <= new Date()) {
            return badRequest('Scheduled time must be in the future', 'INVALID_SCHEDULED_TIME');
        }

        const call = await createWakeUpCall({
            bookingId,
            roomNumber,
            guestName,
            phoneNumber,
            scheduledTime: scheduledDate,
            duration,
            notes,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: bookingId || undefined,
            action: 'CREATE',
            entity: 'wakeUpCall',
            entityId: call.id,
            metadata: {
                roomNumber,
                guestName,
                scheduledTime,
                duration,
            },
            ipAddress: getClientIp(request),
        });

        return created(call);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[WAKEUP_CALLS_CREATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
