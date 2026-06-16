// apps/front-office/src/app/api/bookings/[id]/corporate-billing/route.ts
// Corporate Billing API for a booking

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { assignCorporateBilling, removeCorporateBilling, getCorporateBillingInfo } from '@the-rooms/db/queries/corporateBillingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const assignCorporateBillingSchema = z.object({
    corporateAccountId: z.string().min(1, 'Corporate account ID is required'),
    billingType: z.enum(['COMPANY', 'INDIVIDUAL']).optional().default('COMPANY'),
    notes: z.string().optional(),
});

const removeCorporateBillingSchema = z.object({
    reason: z.string().optional(),
});

// ─── GET /api/bookings/[id]/corporate-billing ─────────────────────────────────────────────
// Get corporate billing info for a booking

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

        const billingInfo = await getCorporateBillingInfo(id);

        return ok(billingInfo);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[CORPORATE_BILLING_INFO]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/bookings/[id]/corporate-billing ─────────────────────────────────────────────
// Assign corporate billing to a booking

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = assignCorporateBillingSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { corporateAccountId, billingType, notes } = parsed.data;
        const userId = (session.user as { id: string }).id;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
            return badRequest('Can only assign corporate billing to confirmed or checked-in bookings', 'INVALID_STATUS');
        }

        // Check if booking already has corporate billing
        if (booking.corporateAccountId) {
            return badRequest('Booking already has corporate billing assigned. Remove it first.', 'ALREADY_ASSIGNED');
        }

        const result = await assignCorporateBilling({
            bookingId: id,
            corporateAccountId,
            billingType,
            notes,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: 'CORPORATE_BILLING_ASSIGNED',
            entity: 'booking',
            entityId: id,
            metadata: {
                corporateAccountId,
                billingType,
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
        if (message.includes('not found') || message.includes('inactive') || message.includes('Credit validation failed')) {
            return badRequest(message, 'CORPORATE_ACCOUNT_ERROR');
        }
        console.error('[CORPORATE_BILLING_ASSIGN]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── DELETE /api/bookings/[id]/corporate-billing ─────────────────────────────────────────────
// Remove corporate billing from a booking

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const reason = body.reason;
        const userId = (session.user as { id: string }).id;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (!booking.corporateAccountId) {
            return badRequest('Booking does not have corporate billing assigned', 'NOT_ASSIGNED');
        }

        const result = await removeCorporateBilling({
            bookingId: id,
            reason,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: 'CORPORATE_BILLING_REMOVED',
            entity: 'booking',
            entityId: id,
            metadata: {
                previousCorporateAccountId: booking.corporateAccountId,
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
        console.error('[CORPORATE_BILLING_REMOVE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
