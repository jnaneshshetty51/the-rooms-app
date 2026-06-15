// apps/admin/src/app/api/corporate-accounts/[id]/route.ts
// Corporate Account single resource API routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import {
    getCorporateAccountFullDetails,
    updateCorporateAccount,
    deleteCorporateAccount,
} from '@the-rooms/db';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') throw new Error('Forbidden');
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

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

// ─── GET /api/corporate-accounts/[id] ────────────────────────────────────────

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;

        const account = await getCorporateAccountFullDetails(id);

        if (!account) {
            return notFound('CorporateAccount', 'NOT_FOUND');
        }

        return ok({ account });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CORPORATE_ACCOUNT_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/corporate-accounts/[id] ──────────────────────────────────────

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateCorporateAccountSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const data = parsed.data;
        const userId = (session?.user as { id?: string }).id;

        // Check if account exists
        const existing = await db.corporateAccount.findUnique({ where: { id } });
        if (!existing) {
            return notFound('CorporateAccount', 'NOT_FOUND');
        }

        const account = await updateCorporateAccount(id, {
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
            action: 'UPDATE',
            entity: 'corporate_account',
            entityId: id,
            metadata: {
                updatedFields: Object.keys(data),
                companyName: data.companyName ?? existing.companyName,
            },
            ipAddress: getClientIp(request),
        });

        return ok({ account });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CORPORATE_ACCOUNT_PATCH]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── DELETE /api/corporate-accounts/[id] ─────────────────────────────────────

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;
        const userId = (session?.user as { id?: string }).id;

        // Check if account exists
        const existing = await db.corporateAccount.findUnique({ where: { id } });
        if (!existing) {
            return notFound('CorporateAccount', 'NOT_FOUND');
        }

        await deleteCorporateAccount(id);

        // Audit log
        await createAuditLog({
            userId,
            action: 'DELETE',
            entity: 'corporate_account',
            entityId: id,
            metadata: {
                companyName: existing.companyName,
            },
            ipAddress: getClientIp(request),
        });

        return ok({ deleted: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        if (message === 'CANNOT_DELETE_ACCOUNT_WITH_ACTIVE_BOOKINGS') {
            return badRequest(
                'Cannot delete corporate account with active bookings',
                'HAS_ACTIVE_BOOKINGS'
            );
        }
        console.error('[CORPORATE_ACCOUNT_DELETE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
