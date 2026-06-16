// apps/front-office/src/app/api/corporate-contracts/[id]/terminate/route.ts
// POST /api/corporate-contracts/[id]/terminate - Terminate contract

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

const terminateSchema = z.object({
    reason: z.string().optional(),
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
        const parsed = terminateSchema.safeParse(body);

        const reason = parsed.success ? parsed.data.reason : undefined;

        const { getCorporateContract, terminateContract } = await import(
            '@the-rooms/db/queries/corporateContractQueries'
        );

        const existing = await getCorporateContract(id);
        if (!existing) {
            return notFound('Contract', 'CONTRACT_NOT_FOUND');
        }

        const contract = await terminateContract(id, reason);

        const userId = (session.user as { id: string }).id;
        await createAuditLog({
            userId,
            action: 'CONTRACT_TERMINATED',
            entity: 'corporateContract',
            entityId: id,
            metadata: {
                contractNumber: contract.contractNumber,
                reason: reason || 'No reason provided',
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Contract terminated',
            contract,
        });
    } catch (error) {
        console.error('[CONTRACT_TERMINATE]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}
