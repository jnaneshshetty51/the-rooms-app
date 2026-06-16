// apps/front-office/src/app/api/dynamic-pricing/rules/[id]/route.ts
// Scenario 49: Update dynamic pricing rule

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { updateDynamicPricingRule } from '@the-rooms/db/queries/dynamicPricingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const updateDynamicPricingRuleSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    conditions: z.object({
        dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
        minOccupancy: z.number().min(0).max(100).optional(),
        maxOccupancy: z.number().min(0).max(100).optional(),
        bookingSource: z.array(z.string()).optional(),
        minNights: z.number().int().min(1).optional(),
        maxNights: z.number().int().min(1).optional(),
        advanceBookingDays: z.number().int().min(0).optional(),
        isWeekend: z.boolean().optional(),
        isHoliday: z.boolean().optional(),
    }).optional(),
    adjustmentType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    adjustmentValue: z.number().optional(),
    priority: z.number().int().optional(),
    roomTypes: z.array(z.enum(['STUDIO', 'PREMIUM'])).optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    isActive: z.boolean().optional(),
});

// ─── PATCH /api/dynamic-pricing/rules/[id] ─────────────────────────────────────

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateDynamicPricingRuleSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id: string }).id;

        const updateData: any = { ...parsed.data };
        if (updateData.validFrom) updateData.validFrom = new Date(updateData.validFrom);
        if (updateData.validUntil) updateData.validUntil = new Date(updateData.validUntil);

        const result = await updateDynamicPricingRule({
            id,
            ...updateData,
            updatedById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'UPDATE',
            entity: 'dynamic_pricing_rule',
            entityId: id,
            metadata: updateData,
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Dynamic pricing rule updated',
            rule: result.rule,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[DYNAMIC_PRICING_RULE_PATCH]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
