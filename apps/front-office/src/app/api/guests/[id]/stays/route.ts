// apps/front-office/src/app/api/guests/[id]/stays/route.ts
// GET /api/guests/[id]/stays - Get stay history

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, serverError } from '@the-rooms/api';

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
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        const { getGuestStayHistory } = await import('@the-rooms/db/queries/guestHistoryQueries');
        const stays = await getGuestStayHistory(id, limit);

        return ok({ stays });
    } catch (error) {
        console.error('[GUEST_STAYS_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
