// apps/front-office/src/app/api/corporate-contracts/[id]/route.ts
// GET /api/corporate-contracts/[id] - Get contract
// PATCH /api/corporate-contracts/[id] - Update contract

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

// ─── Schemas ───────────────────────────────────────────────────────────────────

const updateContractSchema = z.object({
    name: z.string().min(1).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    isAutoRenew: z.boolean().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    paymentTermsDays: z.number().min(0).optional(),
    creditLimit: z.number().positive().optional(),
    guaranteedRooms: z.number().int().min(0).optional(),
    status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
    contractDocUrl: z.string().url().optional().nullable(),
});

// ─── GET /api/corporate-contracts/[id] ───────────────────────────────────────

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

        const { getCorporateContract } = await import('@the-rooms/db/queries/corporateContractQueries');
        const contract = await getCorporateContract(id);

        if (!contract) {
            return notFound('Contract', 'CONTRACT_NOT_FOUND');
        }

        return ok({ contract });
    } catch (error) {
        console.error('[CORPORATE_CONTRACT_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/corporate-contracts/[id] ─────────────────────────────────────

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
        const parsed = updateContractSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { getCorporateContract, updateCorporateContract } = await import(
            '@the-rooms/db/queries/corporateContractQueries'
        );

        const existing = await getCorporateContract(id);
        if (!existing) {
            return notFound('Contract', 'CONTRACT_NOT_FOUND');
        }

        const updateData: Record<string, unknown> = {};
        const { data } = parsed;

        if (data.name !== undefined) updateData.name = data.name;
        if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
        if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
        if (data.isAutoRenew !== undefined) updateData.isAutoRenew = data.isAutoRenew;
        if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent;
        if (data.paymentTermsDays !== undefined) updateData.paymentTermsDays = data.paymentTermsDays;
        if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit;
        if (data.guaranteedRooms !== undefined) updateData.guaranteedRooms = data.guaranteedRooms;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.contractDocUrl !== undefined) updateData.contractDocUrl = data.contractDocUrl;

        const contract = await updateCorporateContract(id, updateData as Parameters<typeof updateCorporateContract>[1]);

        // Audit log
        const userId = (session.user as { id: string }).id;
        await createAuditLog({
            userId,
            action: 'CONTRACT_UPDATED',
            entity: 'corporateContract',
            entityId: id,
            metadata: {
                contractNumber: contract.contractNumber,
                changes: Object.keys(data).join(', '),
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Contract updated',
            contract,
        });
    } catch (error) {
        console.error('[CORPORATE_CONTRACT_PATCH]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}
