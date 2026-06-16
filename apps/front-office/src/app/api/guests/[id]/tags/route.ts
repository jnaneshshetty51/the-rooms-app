// apps/front-office/src/app/api/guests/[id]/tags/route.ts
// GET /api/guests/[id]/tags - Get tags
// POST /api/guests/[id]/tags - Add tag
// DELETE /api/guests/[id]/tags/[tag] - Remove tag

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

const addTagSchema = z.object({
    tag: z.enum(['VIP', 'REGULAR', 'PROBLEM', 'LONG_STAY', 'CORPORATE', 'HONEYMOON', 'BIRTHDAY', 'TRAVEL_AGENT', 'OTA_GUEST']),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { getGuestTags } = await import('@the-rooms/db/queries/guestHistoryQueries');
        const tags = await getGuestTags(id);

        return ok({ tags });
    } catch (error) {
        console.error('[GUEST_TAGS_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

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
        const parsed = addTagSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id?: string }).id;
        const { tagGuest } = await import('@the-rooms/db/queries/guestHistoryQueries');
        const tags = await tagGuest(id, parsed.data.tag);

        await createAuditLog({
            userId,
            action: 'GUEST_TAG_ADDED',
            entity: 'guest',
            entityId: id,
            metadata: { tag: parsed.data.tag },
            ipAddress: getClientIp(request),
        });

        return ok({ message: 'Tag added', tags });
    } catch (error) {
        console.error('[GUEST_TAG_POST]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const tag = new URL(request.url).searchParams.get('tag') ?? '';
        const { untagGuest } = await import('@the-rooms/db/queries/guestHistoryQueries');
        const tags = await untagGuest(id, tag as 'VIP' | 'REGULAR' | 'PROBLEM' | 'LONG_STAY' | 'CORPORATE' | 'HONEYMOON' | 'BIRTHDAY' | 'TRAVEL_AGENT' | 'OTA_GUEST');

        const userId = (session.user as { id?: string }).id;
        await createAuditLog({
            userId,
            action: 'GUEST_TAG_REMOVED',
            entity: 'guest',
            entityId: id,
            metadata: { tag },
            ipAddress: getClientIp(request),
        });

        return ok({ message: 'Tag removed', tags });
    } catch (error) {
        console.error('[GUEST_TAG_DELETE]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}
