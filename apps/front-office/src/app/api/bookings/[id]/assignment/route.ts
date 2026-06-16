// apps/front-office/src/app/api/bookings/[id]/assignment/route.ts
// Room Assignment Status and Management

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { preAssignRoom, autoAssignRoom } from '@the-rooms/db/queries/roomQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const UpdateAssignmentSchema = z.object({
    assignmentType: z.enum(['PRE_ASSIGNED', 'AUTO_ASSIGN']),
    roomId: z.string().optional(), // Required for PRE_ASSIGNED
});

// ─── GET /api/bookings/[id]/assignment ─────────────────────────────────────────
// Get room assignment status for a booking

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

        const booking = await db.booking.findUnique({
            where: { id },
            include: {
                room: true,
                roomAssignment: true,
            },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        const assignment = booking.roomAssignment
            ? {
                type: booking.roomAssignment.assignmentType,
                preAssignedRoomId: booking.roomAssignment.preAssignedRoomId,
                preAssignedAt: booking.roomAssignment.preAssignedAt,
                autoAssignedRoomId: booking.roomAssignment.autoAssignedRoomId,
                autoAssignedAt: booking.roomAssignment.autoAssignedAt,
                finalRoomId: booking.roomAssignment.finalRoomId,
            }
            : null;

        return ok({
            bookingId: id,
            bookingNumber: booking.bookingNumber,
            status: booking.status,
            currentRoom: {
                id: booking.room.id,
                roomNumber: booking.room.roomNumber,
                type: booking.room.type,
                floor: booking.room.floor,
                status: booking.room.status,
                cleaningStatus: booking.room.cleaningStatus,
            },
            assignment,
        });
    } catch (error) {
        console.error('[ASSIGNMENT_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/bookings/[id]/assignment ────────────────────────────────────────
// Change room assignment mode

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = UpdateAssignmentSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { assignmentType, roomId } = parsed.data;
        const userId = (session.user as { id: string }).id;

        // Get booking
        const booking = await db.booking.findUnique({
            where: { id },
            include: { room: true },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        if (booking.status !== 'CONFIRMED') {
            return badRequest(
                'Room assignment can only be changed for confirmed bookings',
                'INVALID_STATUS'
            );
        }

        let result;

        if (assignmentType === 'PRE_ASSIGNED') {
            if (!roomId) {
                return badRequest(
                    'Room ID is required for pre-assignment',
                    'ROOM_ID_REQUIRED'
                );
            }

            // Pre-assign room
            result = await preAssignRoom(id, roomId);

            // Audit log
            await createAuditLog({
                userId,
                bookingId: id,
                action: 'ROOM_PRE_ASSIGNED',
                entity: 'booking',
                entityId: id,
                metadata: {
                    roomId,
                    previousType: booking.roomAssignmentType,
                    newType: 'PRE_ASSIGNED',
                },
                ipAddress: getClientIp(request),
            });
        } else {
            // Auto-assign room
            result = await autoAssignRoom(id, booking.checkIn);

            // Audit log
            await createAuditLog({
                userId,
                bookingId: id,
                action: 'ROOM_AUTO_ASSIGNED',
                entity: 'booking',
                entityId: id,
                metadata: {
                    previousType: booking.roomAssignmentType,
                    newType: 'AUTO_ASSIGN',
                    assignedRoomId: result.room?.id,
                },
                ipAddress: getClientIp(request),
            });
        }

        return ok({
            bookingId: id,
            assignmentType,
            result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[ASSIGNMENT_UPDATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
