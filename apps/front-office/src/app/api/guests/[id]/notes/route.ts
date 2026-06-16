// apps/front-office/src/app/api/guests/[id]/notes/route.ts
// GET /api/guests/[id]/notes - Get notes
// POST /api/guests/[id]/notes - Add note

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, created } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

const addNoteSchema = z.object({
    note: z.string().min(1, 'Note content is required'),
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
        const { getGuestNotes } = await import('@the-rooms/db/queries/guestHistoryQueries');
        const notes = await getGuestNotes(id);

        return ok({ notes });
    } catch (error) {
        console.error('[GUEST_NOTES_GET]', error);
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
        const parsed = addNoteSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const userId = (session.user as { id?: string }).id;
        const { addGuestNote } = await import('@the-rooms/db/queries/guestHistoryQueries');
        const note = await addGuestNote(id, parsed.data.note, userId);

        await createAuditLog({
            userId,
            action: 'GUEST_NOTE_ADDED',
            entity: 'guest',
            entityId: id,
            metadata: { noteId: note.id },
            ipAddress: getClientIp(request),
        });

        return created({ message: 'Note added', note });
    } catch (error) {
        console.error('[GUEST_NOTE_POST]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}
