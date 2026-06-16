// apps/front-office/src/app/api/damage-assessments/route.ts
// Damage Assessment API - List and Create

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { createDamageAssessment, getAllDamageAssessments } from '@the-rooms/db/queries/damageAssessmentQueries';
import { DamageType } from '@the-rooms/db';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const createDamageAssessmentSchema = z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
    roomId: z.string().min(1, 'Room ID is required'),
    description: z.string().min(1, 'Description is required'),
    damageType: z.enum(['MINOR', 'MODERATE', 'SEVERE', 'TOTAL_LOSS']),
    amount: z.number().min(0, 'Amount must be non-negative'),
    images: z.array(z.string()).optional().default([]),
});

const listDamageAssessmentsSchema = z.object({
    bookingId: z.string().optional(),
    roomId: z.string().optional(),
    damageType: z.enum(['MINOR', 'MODERATE', 'SEVERE', 'TOTAL_LOSS']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.number().int().positive().optional().default(1),
    pageSize: z.number().int().positive().optional().default(20),
});

// ─── GET /api/damage-assessments ──────────────────────────────────────────────
// List damage assessments with filters

export async function GET(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { searchParams } = new URL(request.url);
        const bookingId = searchParams.get('bookingId') || undefined;
        const roomId = searchParams.get('roomId') || undefined;
        const damageType = searchParams.get('damageType') as DamageType | undefined;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

        const result = await getAllDamageAssessments({
            bookingId,
            roomId,
            damageType,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page,
            pageSize,
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
        console.error('[DAMAGE_ASSESSMENTS_LIST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/damage-assessments ─────────────────────────────────────────────
// Create a new damage assessment

export async function POST(
    request: NextRequest
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const body = await request.json();
        const parsed = createDamageAssessmentSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { bookingId, roomId, description, damageType, amount, images } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if booking exists
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        // Check if room exists
        const room = await db.room.findUnique({
            where: { id: roomId },
        });

        if (!room) {
            return notFound('Room', 'ROOM_NOT_FOUND');
        }

        const result = await createDamageAssessment({
            bookingId,
            roomId,
            description,
            damageType,
            amount,
            images,
            assessedById: userId!,
        });

        // Audit log
        await createAuditLog({
            userId,
            bookingId,
            action: 'DAMAGE_ASSESSMENT_CREATED',
            entity: 'damageAssessment',
            entityId: result.id,
            metadata: {
                roomId,
                damageType,
                amount,
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
        console.error('[DAMAGE_ASSESSMENT_CREATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
