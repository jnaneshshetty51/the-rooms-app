// apps/front-office/src/app/api/blackout-dates/[id]/route.ts
// Scenario 50: Delete blackout date

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { removeBlackoutDate } from '@the-rooms/db/queries/blackoutQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── DELETE /api/blackout-dates/[id] ────────────────────────────────────────────

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;
        const userId = (session.user as { id: string }).id;

        const result = await removeBlackoutDate({
            id,
            deletedById: userId,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'DELETE',
            entity: 'blackout_date',
            entityId: id,
            ipAddress: getClientIp(request),
        });

        return ok({
            message: 'Blackout date removed',
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (message === 'BLACKOUT_DATE_NOT_FOUND') {
            return notFound('BlackoutDate', 'BLACKOUT_DATE_NOT_FOUND');
        }
        console.error('[BLACKOUT_DATES_DELETE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
