// apps/front-office/src/app/api/loyalty/[guestId]/points/route.ts
// GET /api/loyalty/[guestId]/points - Get guest loyalty points

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, serverError } from '@the-rooms/api';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ guestId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { guestId } = await params;
        const { getGuestLoyaltyPoints } = await import('@the-rooms/db/queries/loyaltyQueries');
        const points = await getGuestLoyaltyPoints(guestId);

        return ok({ points });
    } catch (error) {
        console.error('[LOYALTY_POINTS_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
