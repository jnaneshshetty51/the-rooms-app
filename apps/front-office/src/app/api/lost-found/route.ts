// apps/front-office/src/app/api/lost-found/route.ts
// Lost and Found API - List and Create

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, created, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { getLostAndFoundItems, createLostAndFoundItem } from '@the-rooms/db/queries/lostAndFoundQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createLostAndFoundSchema = z.object({
    bookingId: z.string().optional(),
    roomNumber: z.string().optional(),
    itemDescription: z.string().min(1, 'Item description is required'),
    category: z.enum(['ELECTRONICS', 'CLOTHING', 'JEWELRY', 'DOCUMENTS', 'OTHER']),
    color: z.string().optional(),
    foundDate: z.string().datetime({ message: 'Invalid found date' }),
    identifiedBy: z.string().min(1, 'Identified by staff name is required'),
});

const listLostAndFoundSchema = z.object({
    status: z.enum(['UNCLAIMED', 'CLAIMED', 'DISPOSED', 'RETURNED_TO_GUEST']).optional(),
    category: z.enum(['ELECTRONICS', 'CLOTHING', 'JEWELRY', 'DOCUMENTS', 'OTHER']).optional(),
    bookingId: z.string().optional(),
    roomNumber: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.coerce.number().optional().default(1),
    pageSize: z.coerce.number().optional().default(20),
});

// ─── GET /api/lost-found ────────────────────────────────────────────────────────
// List lost and found items with filters

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { searchParams } = new URL(request.url);
        const params = Object.fromEntries(searchParams.entries());
        const parsed = listLostAndFoundSchema.safeParse(params);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { status, category, bookingId, roomNumber, startDate, endDate, page, pageSize } = parsed.data;

        const result = await getLostAndFoundItems({
            status,
            category,
            bookingId,
            roomNumber,
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
        console.error('[LOST_AND_FOUND_LIST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/lost-found ─────────────────────────────────────────────────────
// Create a new lost and found item

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        await requireStaff(session);

        const body = await request.json();
        const parsed = createLostAndFoundSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { bookingId, roomNumber, itemDescription, category, color, foundDate, identifiedBy } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // If bookingId is provided, verify the booking exists
        if (bookingId) {
            const booking = await db.booking.findUnique({
                where: { id: bookingId },
            });
            if (!booking) {
                return badRequest('Booking not found', 'BOOKING_NOT_FOUND');
            }
        }

        const item = await createLostAndFoundItem({
            bookingId,
            roomNumber,
            itemDescription,
            category,
            color,
            foundDate: new Date(foundDate),
            identifiedBy,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: bookingId || undefined,
            action: 'CREATE',
            entity: 'lostAndFound',
            entityId: item.id,
            metadata: {
                itemDescription,
                category,
                roomNumber,
            },
            ipAddress: getClientIp(request),
        });

        return created(item, 'Lost and found item created successfully');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[LOST_AND_FOUND_CREATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
