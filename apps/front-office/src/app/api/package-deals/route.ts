// apps/front-office/src/app/api/package-deals/route.ts
// POST /api/package-deals - Create package deal
// GET /api/package-deals - List packages

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, created } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

const createPackageSchema = z.object({
    name: z.string().min(1, 'Package name is required'),
    description: z.string().optional(),
    singleOccupancyRate: z.number().positive(),
    doubleOccupancyRate: z.number().positive(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    minNights: z.number().int().min(1).optional().default(1),
    maxNights: z.number().int().positive().optional(),
    roomType: z.enum(['STUDIO', 'PREMIUM']).optional(),
    components: z.object({
        room: z.boolean(),
        breakfast: z.boolean(),
        lunch: z.boolean(),
        dinner: z.boolean(),
        spa: z.boolean(),
        airportTransfer: z.boolean(),
    }),
});

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = createPackageSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { createPackageDeal } = await import('@the-rooms/db/queries/packageDealQueries');
        const packageDeal = await createPackageDeal(parsed.data);

        const userId = (session.user as { id: string }).id;
        await createAuditLog({
            userId,
            action: 'PACKAGE_DEAL_CREATED',
            entity: 'packageDeal',
            entityId: packageDeal.id,
            metadata: {
                name: packageDeal.name,
                singleRate: parsed.data.singleOccupancyRate,
                doubleRate: parsed.data.doubleOccupancyRate,
            },
            ipAddress: getClientIp(request),
        });

        return created({
            message: 'Package deal created',
            packageDeal,
        });
    } catch (error) {
        console.error('[PACKAGE_DEAL_POST]', error);
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
        const propertyId = searchParams.get('propertyId') || undefined;
        const activeOnly = searchParams.get('active') === 'true';

        const { getActivePackageDeals, getAllPackageDeals } = await import(
            '@the-rooms/db/queries/packageDealQueries'
        );

        const packages = activeOnly
            ? await getActivePackageDeals(propertyId)
            : await getAllPackageDeals(propertyId);

        return ok({ packages });
    } catch (error) {
        console.error('[PACKAGE_DEAL_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
