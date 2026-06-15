// apps/front-office/src/app/api/bookings/reservation/[id]/route.ts
// Advance Reservation GET and PATCH routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { Prisma } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        throw new Error('Forbidden');
    }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const updateReservationSchema = z.object({
    checkIn: z.string().datetime().optional(),
    checkOut: z.string().datetime().optional(),
    guestsCount: z.number().int().min(1).optional(),
    specialRequests: z.string().optional(),
    discountCode: z.string().optional(),
    status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
    paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID']).optional(),
});

// ─── GET /api/bookings/reservation/[id] ──────────────────────────────────────

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

        const reservation = await db.booking.findUnique({
            where: { id },
            include: {
                guest: true,
                room: true,
                property: true,
                payments: true,
                advanceDeposit: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!reservation) {
            return notFound('Reservation', 'NOT_FOUND');
        }

        // Calculate pricing details
        const checkIn = new Date(reservation.checkIn);
        const checkOut = new Date(reservation.checkOut);
        const nights = Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get total paid
        const totalPaid = reservation.payments
            .filter(p => p.status === 'PAID')
            .reduce((sum, p) => sum + p.amount.toNumber(), 0);

        const response = {
            reservation,
            pricing: {
                totalAmount: reservation.totalAmount.toNumber(),
                paidAmount: totalPaid,
                balanceDue: reservation.totalAmount.toNumber() - totalPaid,
                nights,
            },
            guest: reservation.guest,
            room: reservation.room,
            property: reservation.property,
            payments: reservation.payments,
            advanceDeposit: reservation.advanceDeposit,
            createdBy: reservation.createdBy,
        };

        return ok(response);
    } catch (error) {
        console.error('[RESERVATION_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/bookings/reservation/[id] ─────────────────────────────────────

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireStaff(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateReservationSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const data = parsed.data;
        const userId = (session.user as { id?: string }).id;

        // Check if reservation exists
        const existing = await db.booking.findUnique({
            where: { id },
            include: { advanceDeposit: true },
        });

        if (!existing) {
            return notFound('Reservation', 'NOT_FOUND');
        }

        // Only allow modifications to HOLD or CONFIRMED reservations
        if (!['HOLD', 'CONFIRMED'].includes(existing.status)) {
            return badRequest(
                'Cannot modify reservation in current status',
                'INVALID_STATUS'
            );
        }

        const updateData: Prisma.BookingUpdateInput = {};

        if (data.checkIn) updateData.checkIn = new Date(data.checkIn);
        if (data.checkOut) updateData.checkOut = new Date(data.checkOut);
        if (data.guestsCount) updateData.guestsCount = data.guestsCount;
        if (data.specialRequests !== undefined) updateData.specialRequests = data.specialRequests;
        if (data.status) updateData.status = data.status;
        if (data.paymentStatus) updateData.paymentStatus = data.paymentStatus;

        // Handle discount code update
        if (data.discountCode !== undefined) {
            if (data.discountCode) {
                const discount = await db.discountCode.findUnique({
                    where: { code: data.discountCode.toUpperCase() },
                });

                if (!discount || !discount.isActive) {
                    return badRequest('Invalid discount code', 'INVALID_DISCOUNT');
                }

                updateData.discountCode = data.discountCode.toUpperCase();
                updateData.discountType = discount.type;
            } else {
                updateData.discountCode = null;
                updateData.discountType = null;
            }
        }

        const updated = await db.booking.update({
            where: { id },
            data: updateData,
            include: {
                guest: true,
                room: true,
                advanceDeposit: true,
            },
        });

        // Audit log
        await createAuditLog({
            userId,
            action: 'UPDATE',
            entity: 'booking',
            entityId: id,
            metadata: {
                bookingNumber: existing.bookingNumber,
                updatedFields: Object.keys(data),
            },
            ipAddress: getClientIp(request),
        });

        return ok({ reservation: updated });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[RESERVATION_PATCH]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
