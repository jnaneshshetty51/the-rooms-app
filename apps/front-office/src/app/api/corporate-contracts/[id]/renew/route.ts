// apps/front-office/src/app/api/corporate-contracts/[id]/renew/route.ts
// POST /api/corporate-contracts/[id]/renew - Renew contract

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

const renewSchema = z.object({
    newEndDate: z.string().datetime(),
});

export async function POST(
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
        const parsed = renewSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { newEndDate } = parsed.data;

        const { getCorporateContract, renewContract } = await import(
            '@the-rooms/db/queries/corporateContractQueries'
        );

        const existing = await getCorporateContract(id);
        if (!existing) {
            return notFound('Contract', 'CONTRACT_NOT_FOUND');
        }

        const contract = await renewContract(id, new Date(newEndDate));

        const userId = (session.user as { id?: string }).id;
        await createAuditLog({
            userId,
            action: 'CONTRACT_RENEWED',
            entity: 'corporateContract',
            entityId: id,
            metadata: {
                contractNumber: contract.contractNumber,
                previousEndDate: existing.endDate,
                newEndDate: contract.endDate,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Contract renewed',
            contract,
        });
    } catch (error) {
        console.error('[CONTRACT_RENEW]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}
