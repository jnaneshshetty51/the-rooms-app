// apps/front-office/src/app/api/bookings/group/[groupId]/route.ts
// Group Booking Detail and Modification

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { Prisma } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import {
    getGroupBooking,
    getGroupBookingByCode,
    updateGroupBookingStatus,
    addRoomToGroup,
    removeRoomFromGroup,
} from '@the-rooms/db/queries/groupBookingQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const UpdateGroupSchema = z.object({
    status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    name: z.string().min(1).optional(),
    contactPerson: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional(),
});

// ─── GET /api/bookings/group/[groupId] ─────────────────────────────────────────
// Get group booking details

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { groupId } = await params;

        // Try to find by ID first, then by group code
        let group = await getGroupBooking(groupId);

        if (!group) {
            group = await getGroupBookingByCode(groupId);
        }

        if (!group) {
            return notFound('Group Booking', 'GROUP_NOT_FOUND');
        }

        // Calculate totals
        const totalRooms = group.bookings.length;
        const totalRevenue = group.bookings.reduce(
            (sum, b) => sum + b.totalAmount.toNumber(),
            0
        );
        const totalPaid = group.bookings.reduce((sum, b) => {
            return sum + b.payments
                .filter((p: any) => p.status === 'PAID')
                .reduce((pSum: number, p: any) => pSum + p.amount.toNumber(), 0);
        }, 0);

        return ok({
            group,
            summary: {
                totalRooms,
                totalRevenue,
                totalPaid,
                balanceDue: totalRevenue - totalPaid,
                confirmedRooms: group.bookings.filter(b => b.status === 'CONFIRMED').length,
                checkedInRooms: group.bookings.filter(b => b.status === 'CHECKED_IN').length,
                checkedOutRooms: group.bookings.filter(b => b.status === 'CHECKED_OUT').length,
            },
        });
    } catch (error) {
        console.error('[GROUP_BOOKING_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/bookings/group/[groupId] ────────────────────────────────────────
// Update group booking

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { groupId } = await params;
        const body = await request.json();
        const parsed = UpdateGroupSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const data = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if group exists
        const existing = await db.groupBooking.findUnique({
            where: { id: groupId },
        });

        if (!existing) {
            return notFound('Group Booking', 'GROUP_NOT_FOUND');
        }

        const updateData: Prisma.GroupBookingUpdateInput = {};
        if (data.status) updateData.status = data.status;
        if (data.name) updateData.name = data.name;
        if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
        if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
        if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;

        const updated = await db.groupBooking.update({
            where: { id: groupId },
            data: updateData,
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'GROUP_BOOKING_UPDATED',
            entity: 'group_booking',
            entityId: groupId,
            metadata: {
                groupCode: existing.groupCode,
                updatedFields: Object.keys(data),
            },
            ipAddress: getClientIp(request),
        });

        return ok({ group: updated });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message === 'Forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('[GROUP_BOOKING_UPDATE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
