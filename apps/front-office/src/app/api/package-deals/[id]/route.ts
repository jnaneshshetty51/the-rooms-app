// apps/front-office/src/app/api/package-deals/[id]/route.ts
// GET /api/package-deals/[id]
// PATCH /api/package-deals/[id]

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

const updatePackageSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    singleOccupancyRate: z.number().positive().optional(),
    doubleOccupancyRate: z.number().positive().optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    minNights: z.number().int().min(1).optional(),
    maxNights: z.number().int().positive().optional(),
    roomType: z.enum(['STUDIO', 'PREMIUM', 'SUITE']).optional(),
    components: z.object({
        room: z.boolean(),
        breakfast: z.boolean(),
        lunch: z.boolean(),
        dinner: z.boolean(),
        spa: z.boolean(),
        airportTransfer: z.boolean(),
    }).optional(),
    isActive: z.boolean().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { getPackageDeal } = await import('@the-rooms/db/queries/packageDealQueries');
        const packageDeal = await getPackageDeal(id);

        if (!packageDeal) {
            return notFound('Package deal', 'PACKAGE_NOT_FOUND');
        }

        return ok({ packageDeal });
    } catch (error) {
        console.error('[PACKAGE_DEAL_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = updatePackageSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { getPackageDeal, updatePackageDeal } = await import(
            '@the-rooms/db/queries/packageDealQueries'
        );

        const existing = await getPackageDeal(id);
        if (!existing) {
            return notFound('Package deal', 'PACKAGE_NOT_FOUND');
        }

        const data = parsed.data;
        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.singleOccupancyRate !== undefined) updateData.singleOccupancyRate = data.singleOccupancyRate;
        if (data.doubleOccupancyRate !== undefined) updateData.doubleOccupancyRate = data.doubleOccupancyRate;
        if (data.validFrom !== undefined) updateData.validFrom = new Date(data.validFrom);
        if (data.validUntil !== undefined) updateData.validUntil = new Date(data.validUntil);
        if (data.minNights !== undefined) updateData.minNights = data.minNights;
        if (data.maxNights !== undefined) updateData.maxNights = data.maxNights;
        if (data.roomType !== undefined) updateData.roomType = data.roomType;
        if (data.components !== undefined) updateData.components = data.components;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        const packageDeal = await updatePackageDeal(id, updateData as Parameters<typeof updatePackageDeal>[1]);

        const userId = (session.user as { id: string }).id;
        await createAuditLog({
            userId,
            action: 'PACKAGE_DEAL_UPDATED',
            entity: 'packageDeal',
            entityId: id,
            metadata: { name: packageDeal.name },
            ipAddress: getClientIp(request),
        });

        return ok({ message: 'Package deal updated', packageDeal });
    } catch (error) {
        console.error('[PACKAGE_DEAL_PATCH]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}
