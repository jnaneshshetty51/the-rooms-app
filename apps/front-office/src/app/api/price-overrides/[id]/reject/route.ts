// apps/front-office/src/app/api/price-overrides/[id]/reject/route.ts
// Reject Price Override Request

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { rejectPriceOverride, getPriceOverrideById } from '@the-rooms/db/queries/priceOverrideQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const rejectPriceOverrideSchema = z.object({
    rejectionReason: z.string().optional(),
});

// ─── POST /api/price-overrides/[id]/reject ────────────────────────────────
// Reject a price override request

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = rejectPriceOverrideSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { rejectionReason } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if the price override request exists
        const existingRequest = await getPriceOverrideById(id);

        if (!existingRequest) {
            return notFound('Price Override Request', 'PRICE_OVERRIDE_NOT_FOUND');
        }

        if (existingRequest.status !== 'PENDING') {
            return badRequest(`Price override request is not pending. Current status: ${existingRequest.status}`, 'INVALID_STATUS');
        }

        const result = await rejectPriceOverride(id, {
            rejectedById: userId!,
            rejectionReason,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: existingRequest.bookingId || undefined,
            action: 'PRICE_OVERRIDE_REJECTED',
            entity: 'priceOverride',
            entityId: id,
            metadata: {
                originalPrice: existingRequest.originalPrice.toNumber(),
                overriddenPrice: existingRequest.overriddenPrice.toNumber(),
                rejectionReason,
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
        console.error('[PRICE_OVERRIDE_REJECT]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
