// apps/admin/src/app/api/corporate-accounts/route.ts
// Corporate Account CRUD API routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, created, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import {
    createCorporateAccount,
    listCorporateAccounts,
    getCorporateAccountFullDetails,
} from '@the-rooms/db';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') throw new Error('Forbidden');
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createCorporateAccountSchema = z.object({
    companyName: z.string().min(1, 'Company name is required'),
    companyGstin: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    paymentTermsDays: z.number().int().min(0).max(90).default(30),
    creditLimit: z.number().positive().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    isActive: z.boolean().default(true),
    billingAddress: z.string().optional(),
    billingCity: z.string().optional(),
    billingState: z.string().optional(),
    billingPincode: z.string().optional(),
});

const updateCorporateAccountSchema = z.object({
    companyName: z.string().min(1).optional(),
    companyGstin: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    paymentTermsDays: z.number().int().min(0).max(90).optional(),
    creditLimit: z.number().positive().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
    billingAddress: z.string().optional(),
    billingCity: z.string().optional(),
    billingState: z.string().optional(),
    billingPincode: z.string().optional(),
});

// ─── GET /api/corporate-accounts ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { searchParams } = new URL(request.url);
        const isActive = searchParams.get('isActive');
        const search = searchParams.get('search') ?? undefined;
        const page = parseInt(searchParams.get('page') ?? '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

        const result = await listCorporateAccounts({
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            search,
            page,
            pageSize,
        });

        return ok(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CORPORATE_ACCOUNTS_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/corporate-accounts ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const body = await request.json();
        const parsed = createCorporateAccountSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const data = parsed.data;
        const userId = (session?.user as { id?: string }).id;

        const account = await createCorporateAccount({
            companyName: data.companyName,
            companyGstin: data.companyGstin,
            contactName: data.contactName,
            contactEmail: data.contactEmail || undefined,
            contactPhone: data.contactPhone,
            paymentTermsDays: data.paymentTermsDays,
            creditLimit: data.creditLimit,
            discountPercent: data.discountPercent,
            isActive: data.isActive,
            billingAddress: data.billingAddress,
            billingCity: data.billingCity,
            billingState: data.billingState,
            billingPincode: data.billingPincode,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'CREATE',
            entity: 'corporate_account',
            entityId: account.id,
            metadata: {
                companyName: data.companyName,
                creditLimit: data.creditLimit,
                paymentTermsDays: data.paymentTermsDays,
            },
            ipAddress: getClientIp(request),
        });

        return created({ account }, { page: 1, pageSize: 1, total: 1 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CORPORATE_ACCOUNTS_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
