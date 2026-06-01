// apps/web/src/app/api/rooms/availability/route.ts
// GET /api/rooms/availability — check room availability for dates

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ok, badRequest } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import type { Prisma } from '@prisma/client';

const AvailabilitySchema = z.object({
  checkIn: z.string(),
  checkOut: z.string(),
  type: z.enum(['STUDIO', 'PREMIUM']).optional(),
  guests: z.coerce.number().int().min(1).max(4).optional(),
});

// GET /api/rooms/availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = AvailabilitySchema.parse(Object.fromEntries(searchParams));

    const checkIn = new Date(params.checkIn);
    const checkOut = new Date(params.checkOut);

    if (checkOut <= checkIn) {
      return badRequest('Check-out must be after check-in');
    }

    // Find all rooms that are not booked for the given dates
    const bookedRoomIds = await db.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
          {
            checkIn: { lte: checkIn },
            checkOut: { gt: checkIn },
          },
          {
            checkIn: { lt: checkOut },
            checkOut: { gte: checkOut },
          },
          {
            checkIn: { gte: checkIn },
            checkOut: { lte: checkOut },
          },
        ],
      },
      select: { roomId: true },
    });

    const bookedIds = new Set(bookedRoomIds.map((b) => b.roomId));

    // Get rooms that are vacant and not booked
    const where: Prisma.RoomWhereInput = {
      status: 'VACANT',
      id: { notIn: [...bookedIds] },
    };

    if (params.type) {
      where.type = params.type;
    }

    const rooms = await db.room.findMany({
      where,
      include: {
        photos: { orderBy: { sortOrder: 'asc' }, take: 1 },
        amenities: { include: { amenity: true } },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    // Calculate nights
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate pricing for each room
    const availableRooms = rooms.map((room) => {
      const guestCount = params.guests ?? 1;
      const pricePerNight = guestCount > 1
        ? Number(room.basePriceDouble)
        : Number(room.basePriceSingle);
      const totalPrice = pricePerNight * nights;
      const isMonthly = nights >= 28;

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        type: room.type,
        floor: room.floor,
        description: room.description,
        photos: room.photos,
        amenities: room.amenities.map((a) => a.amenity),
        pricing: {
          perNight: pricePerNight,
          total: totalPrice,
          nights,
          isMonthly,
          monthlyPriceSingle: room.monthlyPriceSingle
            ? Number(room.monthlyPriceSingle)
            : null,
          monthlyPriceDouble: room.monthlyPriceDouble
            ? Number(room.monthlyPriceDouble)
            : null,
        },
      };
    });

    return ok({
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      nights,
      available: availableRooms.length,
      rooms: availableRooms,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Availability] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
