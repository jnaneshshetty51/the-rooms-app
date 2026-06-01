// apps/web/src/app/api/bookings/[id]/route.ts
// GET /api/bookings/:id
// PATCH /api/bookings/:id
// DELETE /api/bookings/:id

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { ok, notFound, badRequest, unauthorized, forbidden } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { Prisma } from '@prisma/client';

import { db, calculateBookingPrice } from '@the-rooms/db';

const UpdateBookingSchema = z.object({
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  guestsCount: z.number().int().min(1).max(4).optional(),
  specialRequests: z.string().optional(),
  status: z.enum(['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/bookings/:id
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const { id } = await params;

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        room: true,
        payments: true,
        invoice: true,
        documents: true,
      },
    });

    if (!booking) {
      return notFound('Booking');
    }

    // Authorization check
    const userRole = session.user.role;
    const isOwnBooking = booking.guest.email === session.user.email;

    if (userRole === 'GUEST' && !isOwnBooking) {
      return forbidden();
    }

    return ok(booking);
  } catch (error) {
    console.error('[Get Booking] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/bookings/:id
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const data = UpdateBookingSchema.parse(body);


    // Get existing booking
    const existing = await db.booking.findUnique({
      where: { id },
      include: { guest: true, room: true },
    });

    if (!existing) {
      return notFound('Booking');
    }

    // Authorization check
    const userRole = session.user.role;
    const isOwnBooking = existing.guest.email === session.user.email;

    if (userRole === 'GUEST' && !isOwnBooking) {
      return forbidden();
    }

    // Build update data
    const updateData: Prisma.BookingUpdateInput = {};

    if (data.checkIn) {
      updateData.checkIn = new Date(data.checkIn);
    }
    if (data.checkOut) {
      updateData.checkOut = new Date(data.checkOut);
    }
    if (data.guestsCount !== undefined) {
      updateData.guestsCount = data.guestsCount;
    }
    if (data.specialRequests !== undefined) {
      updateData.specialRequests = data.specialRequests;
    }
    if (data.status) {
      updateData.status = data.status;

      // Handle status changes
      if (data.status === 'CHECKED_IN') {
        updateData.checkInTime = new Date();
        // Update room status
        await db.room.update({
          where: { id: existing.roomId },
          data: { status: 'OCCUPIED' },
        });
      } else if (data.status === 'CHECKED_OUT') {
        updateData.checkOutTime = new Date();
        // Update room status
        await db.room.update({
          where: { id: existing.roomId },
          data: { status: 'VACANT' },
        });
      } else if (data.status === 'CANCELLED') {
        // Release the room
        await db.room.update({
          where: { id: existing.roomId },
          data: { status: 'VACANT' },
        });
      }
    }

    // Recalculate pricing if dates changed
    if (data.checkIn || data.checkOut) {
      
      const newCheckIn = data.checkIn ? new Date(data.checkIn) : existing.checkIn;
      const newCheckOut = data.checkOut ? new Date(data.checkOut) : existing.checkOut;
      const newGuests = data.guestsCount ?? existing.guestsCount;

      const pricing = await calculateBookingPrice(
        existing.roomId,
        newCheckIn,
        newCheckOut,
        newGuests,
        existing.bookingType
      );

      updateData.baseAmount = new Prisma.Decimal(pricing.baseAmount);
      updateData.totalAmount = new Prisma.Decimal(pricing.totalAmount);
    }

    const booking = await db.booking.update({
      where: { id },
      data: updateData,
      include: {
        guest: true,
        room: true,
        payments: true,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'booking',
      entityId: id,
      metadata: {
        changes: data,
      },
      ipAddress: getClientIp(request),
    });

    return ok(booking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Update Booking] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/bookings/:id
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const { id } = await params;
    const userRole = session.user.role;

    // Only ADMIN and SUPER_ADMIN can delete bookings
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return forbidden('Only administrators can delete bookings');
    }


    const booking = await db.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return notFound('Booking');
    }

    // Delete booking (cascade will handle related records)
    await db.booking.delete({
      where: { id },
    });

    // Release the room if booking was active
    if (['CONFIRMED', 'CHECKED_IN'].includes(booking.status)) {
      await db.room.update({
        where: { id: booking.roomId },
        data: { status: 'VACANT' },
      });
    }

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'booking',
      entityId: id,
      metadata: { bookingNumber: booking.bookingNumber },
      ipAddress: getClientIp(request),
    });

    return ok({ message: 'Booking deleted' });
  } catch (error) {
    console.error('[Delete Booking] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
