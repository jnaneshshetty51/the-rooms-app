// apps/front-office/src/app/api/monthly-billing/generate-batch/route.ts
// POST /api/monthly-billing/generate-batch - Batch generate invoices

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

const batchGenerateSchema = z.object({
    propertyId: z.string().min(1, 'Property ID is required'),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
});

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = batchGenerateSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { propertyId, month, year } = parsed.data;

        const { generateMonthlyInvoicesBatch } = await import(
            '@the-rooms/db/queries/monthlyBillingQueries'
        );

        const result = await generateMonthlyInvoicesBatch(propertyId, month, year);

        const userId = (session.user as { id: string }).id;
        await createAuditLog({
            userId,
            action: 'MONTHLY_INVOICES_BATCH_GENERATED',
            entity: 'invoice',
            metadata: {
                propertyId,
                month,
                year,
                generated: result.generated,
                failed: result.failed,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: `Generated ${result.generated} invoices, ${result.failed} failed`,
            ...result,
        });
    } catch (error) {
        console.error('[MONTHLY_BILLING_BATCH]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}
