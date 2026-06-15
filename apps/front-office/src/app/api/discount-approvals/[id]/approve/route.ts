// apps/front-office/src/app/api/discount-approvals/[id]/approve/route.ts
// Approve Discount Approval Request

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { approveDiscountRequest, getDiscountRequestById } from '@the-rooms/db/queries/discountApprovalQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const approveDiscountSchema = z.object({
    actualDiscountPercent: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
});

// ─── POST /api/discount-approvals/[id]/approve ────────────────────────────────
// Approve a discount approval request

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = approveDiscountSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { actualDiscountPercent, notes } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if the discount request exists
        const existingRequest = await getDiscountRequestById(id);

        if (!existingRequest) {
            return notFound('Discount Approval Request', 'DISCOUNT_APPROVAL_NOT_FOUND');
        }

        if (existingRequest.status !== 'PENDING') {
            return badRequest(`Discount approval request is not pending. Current status: ${existingRequest.status}`, 'INVALID_STATUS');
        }

        const result = await approveDiscountRequest(id, {
            approvedById: userId!,
            actualDiscountPercent,
            notes,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: existingRequest.bookingId,
            action: 'DISCOUNT_APPROVAL_APPROVED',
            entity: 'discountApprovalRequest',
            entityId: id,
            metadata: {
                requestedDiscountPercent: existingRequest.requestedDiscountPercent.toNumber(),
                actualDiscountPercent: actualDiscountPercent ?? existingRequest.requestedDiscountPercent.toNumber(),
                notes,
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
        console.error('[DISCOUNT_APPROVAL_APPROVE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
