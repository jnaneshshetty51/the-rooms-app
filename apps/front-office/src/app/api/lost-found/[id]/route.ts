// apps/front-office/src/app/api/lost-found/[id]/route.ts
// Lost and Found API - Single Item Operations

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { getLostAndFoundById, updateLostAndFoundItem, deleteLostAndFoundItem } from '@the-rooms/db/queries/lostAndFoundQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const updateLostAndFoundSchema = z.object({
    itemDescription: z.string().min(1).optional(),
    category: z.enum(['ELECTRONICS', 'CLOTHING', 'JEWELRY', 'DOCUMENTS', 'OTHER']).optional(),
    color: z.string().optional(),
    status: z.enum(['UNCLAIMED', 'CLAIMED', 'DISPOSED', 'RETURNED_TO_GUEST']).optional(),
    claimedDate: z.string().datetime().optional(),
    notes: z.string().optional(),
});

// ─── GET /api/lost-found/[id] ───────────────────────────────────────────────────
// Get single lost and found item

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;

        const item = await getLostAndFoundById(id);

        if (!item) {
            return notFound('LostAndFound', 'ITEM_NOT_FOUND');
        }

        return ok(item);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[LOST_AND_FOUND_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/lost-found/[id] ────────────────────────────────────────────────
// Update lost and found item status

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateLostAndFoundSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id?: string }).id;

        // Check if item exists
        const existing = await getLostAndFoundById(id);
        if (!existing) {
            return notFound('LostAndFound', 'ITEM_NOT_FOUND');
        }

        const { status, claimedDate, ...otherData } = parsed.data;

        // Update other fields first
        if (Object.keys(otherData).length > 0) {
            await updateLostAndFoundItem(id, otherData);
        }

        // Handle status changes
        if (status) {
            if (status === 'CLAIMED' || status === 'RETURNED_TO_GUEST') {
                await updateLostAndFoundItem(id, {
                    status,
                    claimedDate: claimedDate ? new Date(claimedDate) : new Date(),
                });
            } else if (status === 'DISPOSED') {
                await updateLostAndFoundItem(id, { status });
            } else {
                await updateLostAndFoundItem(id, { status });
            }
        }

        // Get updated item
        const updated = await getLostAndFoundById(id);

        // Audit log
        await createAuditLog({
            userId,
            bookingId: existing.bookingId || undefined,
            action: 'UPDATE',
            entity: 'lostAndFound',
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
        console.error('[LOST_AND_FOUND_UPDATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── DELETE /api/lost-found/[id] ───────────────────────────────────────────────
// Delete a lost and found item (admin only)

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const userId = (session.user as { id?: string }).id;

        // Check if item exists
        const existing = await getLostAndFoundById(id);
        if (!existing) {
            return notFound('LostAndFound', 'ITEM_NOT_FOUND');
        }

        await deleteLostAndFoundItem(id);

        // Audit log
        await createAuditLog({
            userId,
            bookingId: existing.bookingId || undefined,
            action: 'DELETE',
            entity: 'lostAndFound',
            entityId: id,
            metadata: {
                itemDescription: existing.itemDescription,
                category: existing.category,
            },
            ipAddress: getClientIp(request),
        });

        return ok({ success: true });
    } catch (error) {
        console.error('[LOST_AND_FOUND_DELETE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
