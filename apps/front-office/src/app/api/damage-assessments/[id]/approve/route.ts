// apps/front-office/src/app/api/damage-assessments/[id]/approve/route.ts
// Damage Assessment Approval API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { getDamageAssessmentById, approveDamageCharge } from '@the-rooms/db/queries/damageAssessmentQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const approveDamageChargeSchema = z.object({
    notes: z.string().optional(),
});

// ─── POST /api/damage-assessments/[id]/approve ────────────────────────────────
// Approve damage charge and add to folio

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = approveDamageChargeSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id: string }).id;
        const assessment = await getDamageAssessmentById(id);

        if (!assessment) {
            return notFound('DamageAssessment', 'ASSESSMENT_NOT_FOUND');
        }

        const result = await approveDamageCharge(id, {
            approvedById: userId!,
            notes: parsed.data.notes,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId: assessment.bookingId,
            action: 'DAMAGE_CHARGE_APPROVED',
            entity: 'damageAssessment',
            entityId: id,
            metadata: {
                amount: assessment.amount.toNumber(),
                damageType: assessment.damageType,
                chargeId: result.charge.id,
                totalWithTax: result.charge.totalAmount.toNumber(),
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Damage charge approved and added to folio',
            assessment: {
                id: assessment.id,
                description: assessment.description,
                damageType: assessment.damageType,
                amount: assessment.amount,
            },
            charge: result.charge,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[DAMAGE_CHARGE_APPROVE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
