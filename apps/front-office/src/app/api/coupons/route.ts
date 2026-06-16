// apps/front-office/src/app/api/coupons/route.ts
// POST /api/coupons - Create coupon
// GET /api/coupons - List coupons

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, created } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

const createCouponSchema = z.object({
    code: z.string().min(3, 'Code must be at least 3 characters').max(20),
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_NIGHT', 'UPGRADE']),
    value: z.number().positive(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    maxUses: z.number().int().positive().optional(),
    maxUsesPerUser: z.number().int().positive().optional(),
    minNights: z.number().int().min(1).optional().default(1),
    maxNights: z.number().int().positive().optional(),
    minBookingValue: z.number().positive().optional(),
    maxBookingValue: z.number().positive().optional(),
    applicableRoomTypes: z.array(z.enum(['STUDIO', 'PREMIUM', 'SUITE'])).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = createCouponSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { createCoupon } = await import('@the-rooms/db/queries/couponQueries');
        const coupon = await createCoupon(parsed.data);

        const userId = (session.user as { id?: string }).id;
        await createAuditLog({
            userId,
            action: 'COUPON_CREATED',
            entity: 'discountCode',
            entityId: coupon.id,
            metadata: { code: coupon.code, type: coupon.type },
            ipAddress: getClientIp(request),
        });

        return created({ message: 'Coupon created', coupon });
    } catch (error) {
        console.error('[COUPON_POST]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as 'active' | 'inactive' | 'expired' | 'all' | null;
        const propertyId = searchParams.get('propertyId') || undefined;

        const { getCoupons } = await import('@the-rooms/db/queries/couponQueries');
        const coupons = await getCoupons(propertyId, status || undefined);

        return ok({ coupons });
    } catch (error) {
        console.error('[COUPON_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
