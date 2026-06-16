// apps/front-office/src/app/api/dynamic-pricing/rules/route.ts
// Scenario 49: Dynamic pricing rules management

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { createDynamicPricingRule, getAllDynamicPricingRules } from '@the-rooms/db/queries/dynamicPricingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createDynamicPricingRuleSchema = z.object({
    propertyId: z.string().optional().default('default'),
    name: z.string().min(1, 'Name is required'),
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
    }),
    adjustmentType: z.enum(['PERCENTAGE', 'FIXED']),
    adjustmentValue: z.number(),
    priority: z.number().int().optional().default(0),
    roomTypes: z.array(z.enum(['STUDIO', 'PREMIUM'])).optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    isActive: z.boolean().optional().default(true),
});

// ─── GET /api/dynamic-pricing/rules ─────────────────────────────────────────────

export async function GET(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get('propertyId') || 'default';
        const activeOnly = searchParams.get('activeOnly') !== 'false';
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = parseInt(searchParams.get('perPage') || '20');

        const result = await getAllDynamicPricingRules({
            propertyId,
            activeOnly,
            page,
            perPage,
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
        console.error('[DYNAMIC_PRICING_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/dynamic-pricing/rules ───────────────────────────────────────────

export async function POST(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const body = await request.json();
        const parsed = createDynamicPricingRuleSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id?: string }).id;

        const result = await createDynamicPricingRule({
            ...parsed.data,
            validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : undefined,
            validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
            createdById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'CREATE',
            entity: 'dynamic_pricing_rule',
            entityId: result.rule.id,
            metadata: {
                name: parsed.data.name,
                conditions: parsed.data.conditions,
                adjustmentType: parsed.data.adjustmentType,
                adjustmentValue: parsed.data.adjustmentValue,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Dynamic pricing rule created',
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
        console.error('[DYNAMIC_PRICING_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
