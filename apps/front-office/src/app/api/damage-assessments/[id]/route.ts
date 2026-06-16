// apps/front-office/src/app/api/damage-assessments/[id]/route.ts
// Damage Assessment API - Get, Update, Delete by ID

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { getDamageAssessmentById, updateDamageAssessment, deleteDamageAssessment } from '@the-rooms/db/queries/damageAssessmentQueries';
import { DamageType } from '@the-rooms/db';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const updateDamageAssessmentSchema = z.object({
    description: z.string().min(1, 'Description is required').optional(),
    damageType: z.enum(['MINOR', 'MODERATE', 'SEVERE', 'TOTAL_LOSS']).optional(),
    amount: z.number().min(0, 'Amount must be non-negative').optional(),
    images: z.array(z.string()).optional(),
});

// ─── GET /api/damage-assessments/[id] ─────────────────────────────────────────

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const assessment = await getDamageAssessmentById(id);

        if (!assessment) {
            return notFound('DamageAssessment', 'ASSESSMENT_NOT_FOUND');
        }

        return ok(assessment);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[DAMAGE_ASSESSMENT_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/damage-assessments/[id] ────────────────────────────────────────

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateDamageAssessmentSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id?: string }).id;
        const assessment = await getDamageAssessmentById(id);

        if (!assessment) {
            return notFound('DamageAssessment', 'ASSESSMENT_NOT_FOUND');
        }

        const result = await updateDamageAssessment(id, parsed.data);

        // Audit log
        await createAuditLog({
            userId,
            bookingId: assessment.bookingId,
            action: 'DAMAGE_ASSESSMENT_UPDATED',
            entity: 'damageAssessment',
            entityId: id,
            metadata: {
                changes: parsed.data,
            },
            ipAddress: getClientIp(request),
        });

        return ok(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[DAMAGE_ASSESSMENT_UPDATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── DELETE /api/damage-assessments/[id] ──────────────────────────────────────

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;
        const userId = (session.user as { id?: string }).id;
        const assessment = await getDamageAssessmentById(id);

        if (!assessment) {
            return notFound('DamageAssessment', 'ASSESSMENT_NOT_FOUND');
        }

        await deleteDamageAssessment(id);

        // Audit log
        await createAuditLog({
            userId,
            bookingId: assessment.bookingId,
            action: 'DAMAGE_ASSESSMENT_DELETED',
            entity: 'damageAssessment',
            entityId: id,
            metadata: {
                deletedAmount: assessment.amount.toNumber(),
                damageType: assessment.damageType,
            },
            ipAddress: getClientIp(request),
        });

        return ok({ message: 'Damage assessment deleted successfully' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[DAMAGE_ASSESSMENT_DELETE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
