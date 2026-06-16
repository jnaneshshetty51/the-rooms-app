// apps/front-office/src/app/api/corporate-contracts/route.ts
// POST /api/corporate-contracts - Create a new corporate contract
// GET /api/corporate-contracts - List contracts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, created } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createContractSchema = z.object({
    corporateAccountId: z.string().min(1, 'Corporate account ID is required'),
    name: z.string().min(1, 'Contract name is required'),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    isAutoRenew: z.boolean().optional().default(false),
    discountPercent: z.number().min(0).max(100).optional().default(0),
    paymentTermsDays: z.number().min(0).optional().default(30),
    creditLimit: z.number().positive().optional(),
    guaranteedRooms: z.number().int().min(0).optional().default(0),
    contractDocUrl: z.string().url().optional(),
});

const listContractsSchema = z.object({
    corporateAccountId: z.string().optional(),
    status: z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED', 'DRAFT', 'PENDING', 'ALL']).optional().default('ALL'),
    propertyId: z.string().optional(),
});

// ─── POST /api/corporate-contracts ───────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = createContractSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const {
            corporateAccountId,
            name,
            startDate,
            endDate,
            isAutoRenew,
            discountPercent,
            paymentTermsDays,
            creditLimit,
            guaranteedRooms,
            contractDocUrl,
        } = parsed.data;

        // Verify corporate account exists
        const corporateAccount = await db.corporateAccount.findUnique({
            where: { id: corporateAccountId },
        });

        if (!corporateAccount) {
            return badRequest('Corporate account not found', 'ACCOUNT_NOT_FOUND');
        }

        // Create contract
        const { createCorporateContract } = await import('@the-rooms/db/queries/corporateContractQueries');
        const contract = await createCorporateContract(corporateAccountId, {
            name,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isAutoRenew,
            discountPercent,
            paymentTermsDays,
            creditLimit,
            guaranteedRooms,
            contractDocUrl,
        });

        // Audit log
        const userId = (session.user as { id?: string }).id;
        await createAuditLog({
            userId,
            action: 'CONTRACT_CREATED',
            entity: 'corporateContract',
            entityId: contract.id,
            metadata: {
                contractNumber: contract.contractNumber,
                corporateAccountId,
                name,
                discountPercent,
            },
            ipAddress: getClientIp(request),
        });

        return created({
            message: 'Corporate contract created',
            contract,
        });
    } catch (error) {
        console.error('[CORPORATE_CONTRACT_POST]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}

// ─── GET /api/corporate-contracts ────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const corporateAccountId = searchParams.get('corporateAccountId');
        const status = searchParams.get('status') || 'ALL';
        const propertyId = searchParams.get('propertyId');

        const { getCorporateContracts, getActiveContracts, getCorporateContract } = await import(
            '@the-rooms/db/queries/corporateContractQueries'
        );

        let contracts;

        if (corporateAccountId) {
            contracts = await getCorporateContracts(corporateAccountId);
        } else if (status === 'ACTIVE' && propertyId) {
            contracts = await getActiveContracts(propertyId);
        } else {
            // Return all contracts (with optional status filter)
            const { prisma } = await import('@the-rooms/db');
            const where: Record<string, unknown> = {};

            if (status && status !== 'ALL') {
                where.status = status;
            }

            contracts = await prisma.corporateContract.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    corporateAccount: true,
                },
            });
        }

        return ok({ contracts });
    } catch (error) {
        console.error('[CORPORATE_CONTRACT_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
