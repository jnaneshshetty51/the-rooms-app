// apps/web/src/app/api/bookings/[id]/check-in/route.ts
// POST /api/bookings/:id/check-in

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, unauthorized, forbidden } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';

import { db } from '@the-rooms/db';
type RouteParams = { params: Promise<{ id: string }> };

const CheckInSchema = z.object({
  roomId: z.string().optional(),
  signatureData: z.string().optional(), // Base64 signature image
  verifiedDocuments: z.array(z.string()).optional(),
});

// POST /api/bookings/:id/check-in
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const userRole = session.user.role;
    if (!['SUPER_ADMIN', 'ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
      return forbidden();
    }

    const { id } = await params;
    const body = await request.json();
    const data = CheckInSchema.parse(body);


    // Get booking
    const booking = await db.booking.findUnique({
      where: { id },
      include: { guest: true, room: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'CHECKED_IN') {
      return badRequest('Guest is already checked in');
    }

    if (booking.status === 'CHECKED_OUT') {
      return badRequest('Cannot check in a checked-out booking');
    }

    if (booking.status === 'CANCELLED') {
      return badRequest('Cannot check in a cancelled booking');
    }

    // Update booking
    const updatedBooking = await db.booking.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        checkInTime: new Date(),
      },
    });

    // Update room status
    const roomId = data.roomId ?? booking.roomId;
    await db.room.update({
      where: { id: roomId },
      data: { status: 'OCCUPIED' },
    });

    // Update guest stay count
    await db.guest.update({
      where: { id: booking.guestId },
      data: { stayCount: { increment: 1 } },
    });

    // Mark documents as verified if provided
    if (data.verifiedDocuments && data.verifiedDocuments.length > 0) {
      await db.guestDocument.updateMany({
        where: { id: { in: data.verifiedDocuments } },
        data: { verified: true, verifiedAt: new Date(), verifiedById: session.user.id },
      });
    }

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'CHECK_IN',
      entity: 'booking',
      entityId: id,
      metadata: {
        bookingNumber: booking.bookingNumber,
        roomId,
        roomNumber: booking.room.roomNumber,
        guestName: booking.guest.name,
      },
      ipAddress: getClientIp(request),
    });

    return ok({
      booking: updatedBooking,
      roomId,
      message: 'Check-in completed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Check-in] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
