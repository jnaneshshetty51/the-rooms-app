// apps/front-office/src/app/api/bookings/group/route.ts
// Group Booking Creation and Management

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { Prisma } from '@the-rooms/db';
import { ok, badRequest, serverError, created } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import {
    createGroupBooking,
    getGroupBookings,
    generateGroupCode,
} from '@the-rooms/db/queries/groupBookingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const CreateGroupBookingSchema = z.object({
    name: z.string().min(1, 'Group name is required'),
    contactPerson: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional(),
    billingType: z.enum(['SHARED', 'INDIVIDUAL', 'MIXED']).default('INDIVIDUAL'),
    checkInDate: z.string().datetime({ message: 'Invalid check-in date' }),
    checkOutDate: z.string().datetime({ message: 'Invalid check-out date' }),
    rooms: z.array(z.object({
        roomType: z.enum(['STUDIO', 'PREMIUM']),
        count: z.number().int().min(1),
    })).min(1, 'At least one room type is required'),
    corporateAccountId: z.string().optional(),
    propertyId: z.string().default('default'),
});

const ListGroupBookingsSchema = z.object({
    status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── POST /api/bookings/group ──────────────────────────────────────────────────
// Create a new group booking

export async function POST(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const body = await request.json();
        const parsed = CreateGroupBookingSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const data = parsed.data;
        const userId = (session.user as { id?: string }).id;

        const checkInDate = new Date(data.checkInDate);
        const checkOutDate = new Date(data.checkOutDate);

        if (checkOutDate <= checkInDate) {
            return badRequest(
                'Check-out must be after check-in',
                'INVALID_DATES'
            );
        }

        const result = await createGroupBooking({
            name: data.name,
            contactPerson: data.contactPerson,
            contactPhone: data.contactPhone,
            contactEmail: data.contactEmail,
            billingType: data.billingType,
            checkInDate,
            checkOutDate,
            rooms: data.rooms,
            corporateAccountId: data.corporateAccountId,
            createdById: userId,
            propertyId: data.propertyId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'GROUP_BOOKING_CREATED',
            entity: 'group_booking',
            entityId: result.group.id,
            metadata: {
                groupCode: result.group.groupCode,
                name: data.name,
                roomCount: result.bookings.length,
                errors: result.errors,
            },
            ipAddress: getClientIp(request),
        });

        return created({
            group: result.group,
            bookings: result.bookings,
            errors: result.errors,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[GROUP_BOOKING_CREATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── GET /api/bookings/group ────────────────────────────────────────────────────
// List all group bookings

export async function GET(
    request: NextRequest
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const parsed = ListGroupBookingsSchema.safeParse({
            status: searchParams.get('status'),
            page: searchParams.get('page'),
            perPage: searchParams.get('perPage'),
        });

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { status, page, perPage } = parsed.data;

        const result = await getGroupBookings({
            status,
            page,
            perPage,
        });

        return ok(result);
    } catch (error) {
        console.error('[GROUP_BOOKINGS_LIST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
