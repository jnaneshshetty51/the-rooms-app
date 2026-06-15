// apps/front-office/src/app/api/discount-approvals/route.ts
// Discount Approval Requests API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { createDiscountApprovalRequest, getPendingDiscountRequests, getDiscountRequestsByBooking } from '@the-rooms/db/queries/discountApprovalQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createDiscountApprovalSchema = z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
    discountCodeId: z.string().optional(),
    originalDiscountAmount: z.number().optional(),
    requestedDiscountPercent: z.number().min(0).max(100, 'Discount percent must be between 0 and 100'),
    reason: z.string().optional(),
});

const listDiscountApprovalsSchema = z.object({
    bookingId: z.string().optional(),
    limit: z.number().int().positive().optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
});

// ─── GET /api/discount-approvals ──────────────────────────────────────────────
// List pending discount approval requests or requests for a specific booking

export async function GET(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { searchParams } = new URL(request.url);
        const bookingId = searchParams.get('bookingId');
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // If bookingId is provided, get requests for that booking
        if (bookingId) {
            // Check if booking exists
            const booking = await db.booking.findUnique({
                where: { id: bookingId },
            });

            if (!booking) {
                return notFound('Booking', 'BOOKING_NOT_FOUND');
            }

            const requests = await getDiscountRequestsByBooking(bookingId);
            return ok({ requests, total: requests.length });
        }

        // Otherwise, get all pending requests
        const result = await getPendingDiscountRequests({ limit, offset });
        return ok(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[DISCOUNT_APPROVALS_LIST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/discount-approvals ─────────────────────────────────────────────
// Create a new discount approval request

export async function POST(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const body = await request.json();
        const parsed = createDiscountApprovalSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { bookingId, discountCodeId, originalDiscountAmount, requestedDiscountPercent, reason } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
            return badRequest('Can only request discounts for confirmed or checked-in bookings', 'INVALID_STATUS');
        }

        const result = await createDiscountApprovalRequest({
            bookingId,
            discountCodeId,
            originalDiscountAmount,
            requestedDiscountPercent,
            requestedById: userId!,
            reason,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId,
            action: 'DISCOUNT_APPROVAL_REQUESTED',
            entity: 'discountApprovalRequest',
            entityId: result.id,
            metadata: {
                requestedDiscountPercent,
                reason,
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
        if (message.includes('already a pending')) {
            return badRequest(message, 'PENDING_EXISTS');
        }
        console.error('[DISCOUNT_APPROVAL_CREATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
