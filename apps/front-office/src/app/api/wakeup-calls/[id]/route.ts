// apps/front-office/src/app/api/wakeup-calls/[id]/route.ts
// Wake-Up Call API - Single Item Operations

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { getWakeUpCallById, updateWakeUpCall, completeWakeUpCall, cancelWakeUpCall, deleteWakeUpCall } from '@the-rooms/db/queries/wakeUpCallQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const updateWakeUpCallSchema = z.object({
    scheduledTime: z.string().datetime().optional(),
    duration: z.number().int().positive().optional(),
    status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED', 'MISSED']).optional(),
    notes: z.string().optional(),
});

// ─── GET /api/wakeup-calls/[id] ───────────────────────────────────────────────────
// Get single wake-up call

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;

        const call = await getWakeUpCallById(id);

        if (!call) {
            return notFound('WakeUpCall', 'CALL_NOT_FOUND');
        }

        return ok(call);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[WAKEUP_CALL_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/wakeup-calls/[id] ────────────────────────────────────────────────
// Update wake-up call

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateWakeUpCallSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id: string }).id;

        // Check if call exists
        const existing = await getWakeUpCallById(id);
        if (!existing) {
            return notFound('WakeUpCall', 'CALL_NOT_FOUND');
        }

        const { status, ...otherData } = parsed.data;

        // Handle status-specific updates
        if (status === 'COMPLETED') {
            await completeWakeUpCall(id);
        } else if (status === 'CANCELLED') {
            await cancelWakeUpCall(id);
        } else if (status === 'MISSED') {
            await updateWakeUpCall(id, { status: 'MISSED' });
        } else if (Object.keys(otherData).length > 0) {
            await updateWakeUpCall(id, {
                ...otherData,
                scheduledTime: otherData.scheduledTime ? new Date(otherData.scheduledTime) : undefined,
            });
        }

        // Get updated call
        const updated = await getWakeUpCallById(id);

        // Audit log
        await createAuditLog({
            userId,
            bookingId: existing.bookingId || undefined,
            action: 'UPDATE',
            entity: 'wakeUpCall',
            entityId: id,
            metadata: {
                previousStatus: existing.status,
                newStatus: status || existing.status,
            },
            ipAddress: getClientIp(request),
        });

        return ok(updated);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[WAKEUP_CALL_UPDATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── DELETE /api/wakeup-calls/[id] ───────────────────────────────────────────────
// Delete a wake-up call

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const userId = (session.user as { id: string }).id;

        // Check if call exists
        const existing = await getWakeUpCallById(id);
        if (!existing) {
            return notFound('WakeUpCall', 'CALL_NOT_FOUND');
        }

        await deleteWakeUpCall(id);

        // Audit log
        await createAuditLog({
            userId,
            bookingId: existing.bookingId || undefined,
            action: 'DELETE',
            entity: 'wakeUpCall',
            entityId: id,
            metadata: {
                roomNumber: existing.roomNumber,
                scheduledTime: existing.scheduledTime,
            },
            ipAddress: getClientIp(request),
        });

        return ok({ success: true });
    } catch (error) {
        console.error('[WAKEUP_CALL_DELETE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
