// apps/web/src/app/api/rooms/[id]/route.ts
// GET /api/rooms/:id — get single room with details
// PATCH /api/rooms/:id — update room (admin only)
// DELETE /api/rooms/:id — delete room (super admin only)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { ok, notFound, badRequest, unauthorized, forbidden, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { Prisma } from '@prisma/client';

import { db } from '@the-rooms/db';
const UpdateRoomSchema = z.object({
  basePriceSingle: z.number().positive().optional(),
  basePriceDouble: z.number().positive().optional(),
  monthlyPriceSingle: z.number().positive().optional().nullable(),
  monthlyPriceDouble: z.number().positive().optional().nullable(),
  maxOccupancy: z.number().int().min(1).max(4).optional(),
  sizeSqft: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED']).optional(),
  internalNotes: z.string().optional().nullable(),
});

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/rooms/:id
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const room = await db.room.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        amenities: { include: { amenity: true } },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            checkOut: { gte: new Date() },
          },
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            guest: { select: { name: true, phone: true } },
          },
          orderBy: { checkIn: 'asc' },
        },
      },
    });

    if (!room) {
      return notFound('Room');
    }

    return ok(room);
  } catch (error) {
    console.error('[Get Room] Error:', error);
    return serverError();
  }
}

// PATCH /api/rooms/:id
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const userRole = session.user.role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return forbidden();
    }

    const { id } = await params;
    const body = await request.json();
    const data = UpdateRoomSchema.parse(body);


    const existing = await db.room.findUnique({ where: { id } });
    if (!existing) {
      return notFound('Room');
    }

    // Build update data
    const updateData: Prisma.RoomUpdateInput = {};

    if (data.basePriceSingle !== undefined) {
      updateData.basePriceSingle = new Prisma.Decimal(data.basePriceSingle);
    }
    if (data.basePriceDouble !== undefined) {
      updateData.basePriceDouble = new Prisma.Decimal(data.basePriceDouble);
    }
    if (data.monthlyPriceSingle !== undefined) {
      updateData.monthlyPriceSingle = data.monthlyPriceSingle
        ? new Prisma.Decimal(data.monthlyPriceSingle)
        : null;
    }
    if (data.monthlyPriceDouble !== undefined) {
      updateData.monthlyPriceDouble = data.monthlyPriceDouble
        ? new Prisma.Decimal(data.monthlyPriceDouble)
        : null;
    }
    if (data.maxOccupancy !== undefined) {
      updateData.maxOccupancy = data.maxOccupancy;
    }
    if (data.sizeSqft !== undefined) {
      updateData.sizeSqft = data.sizeSqft;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.internalNotes !== undefined) {
      updateData.internalNotes = data.internalNotes;
    }

    const room = await db.room.update({
      where: { id },
      data: updateData,
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        amenities: { include: { amenity: true } },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'room',
      entityId: id,
      metadata: {
        roomNumber: room.roomNumber,
        changes: data,
      },
      ipAddress: getClientIp(request),
    });

    return ok(room);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Update Room] Error:', error);
    return serverError();
  }
}

// DELETE /api/rooms/:id
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return forbidden('Only super administrators can delete rooms');
    }

    const { id } = await params;

    const room = await db.room.findUnique({ where: { id } });
    if (!room) {
      return notFound('Room');
    }

    // Check for active bookings
    const activeBookings = await db.booking.count({
      where: {
        roomId: id,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
    });

    if (activeBookings > 0) {
      return badRequest('Cannot delete room with active bookings');
    }

    await db.room.delete({ where: { id } });

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'room',
      entityId: id,
      metadata: { roomNumber: room.roomNumber },
      ipAddress: getClientIp(request),
    });

    return ok({ message: 'Room deleted' });
  } catch (error) {
    console.error('[Delete Room] Error:', error);
    return serverError();
  }
}