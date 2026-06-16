// apps/front-office/src/app/api/guests/[id]/preferences/route.ts
// GET /api/guests/[id]/preferences - Get preferences
// PATCH /api/guests/[id]/preferences - Update preferences

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

const updatePreferencesSchema = z.object({
    preferredRoomType: z.enum(['STUDIO', 'PREMIUM']).optional(),
    preferredFloor: z.number().int().min(1).optional(),
    preferredRoomNumbers: z.array(z.string()).optional(),
    avoidRoomNumbers: z.array(z.string()).optional(),
    preferredBedding: z.string().optional(),
    preferredAmenities: z.array(z.string()).optional(),
    dislikedAmenities: z.array(z.string()).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    preferredChannel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'CALL']).optional(),
    notes: z.string().optional(),
    isVegetarian: z.boolean().optional(),
    hasAllergies: z.boolean().optional(),
    allergyDetails: z.string().optional(),
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
        const { getGuestPreferences } = await import('@the-rooms/db/queries/guestHistoryQueries');
        const preferences = await getGuestPreferences(id);

        return ok({ preferences });
    } catch (error) {
        console.error('[GUEST_PREFERENCES_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

export async function PATCH(
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
        const parsed = updatePreferencesSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { updateGuestPreferences } = await import('@the-rooms/db/queries/guestHistoryQueries');
        const preferences = await updateGuestPreferences(id, parsed.data);

        const userId = (session.user as { id: string }).id;
        await createAuditLog({
            userId,
            action: 'GUEST_PREFERENCES_UPDATED',
            entity: 'guest',
            entityId: id,
            metadata: { updatedFields: Object.keys(parsed.data).join(', ') },
            ipAddress: getClientIp(request),
        });

        return ok({ message: 'Preferences updated', preferences });
    } catch (error) {
        console.error('[GUEST_PREFERENCES_PATCH]', error);
        const message = error instanceof Error ? error.message : 'Internal error';
        return serverError(message, 'INTERNAL_ERROR');
    }
}
