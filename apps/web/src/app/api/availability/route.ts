import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError } from '@the-rooms/api';

const AvailabilitySchema = z.object({
  checkIn: z.string().datetime({ message: 'Valid check-in date required' }),
  checkOut: z.string().datetime({ message: 'Valid check-out date required' }),
  guestsCount: z.coerce.number().int().min(1).max(4).default(1),
  type: z.enum(['STUDIO', 'PREMIUM', 'MONTHLY']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = AvailabilitySchema.parse({
      checkIn: searchParams.get('checkIn') ? new Date(searchParams.get('checkIn') as string).toISOString() : undefined,
      checkOut: searchParams.get('checkOut') ? new Date(searchParams.get('checkOut') as string).toISOString() : undefined,
      guestsCount: searchParams.get('guestsCount'),
      type: searchParams.get('type') || undefined,
    });

    const checkInDate = new Date(params.checkIn);
    const checkOutDate = new Date(params.checkOut);

    if (checkOutDate <= checkInDate) {
      return badRequest('Check-out must be after check-in');
    }

    // Find rooms that match type and are not blocked/maintenance
    const roomWhere: any = {
      status: { notIn: ['MAINTENANCE', 'BLOCKED'] },
      maxOccupancy: { gte: params.guestsCount },
    };
    
    // If MONTHLY is selected, we only show STUDIO
    if (params.type === 'MONTHLY') {
      roomWhere.type = 'STUDIO';
    } else if (params.type) {
      roomWhere.type = params.type;
    }

    // Get all rooms that match basic criteria
    const allMatchingRooms = await db.room.findMany({
      where: roomWhere,
      include: {
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
        amenities: {
          include: { amenity: true },
        },
      },
    });

    // Find bookings that overlap with requested dates
    const overlappingBookings = await db.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        roomId: { in: allMatchingRooms.map(r => r.id) },
        OR: [
          { checkIn: { lte: checkInDate }, checkOut: { gt: checkInDate } },
          { checkIn: { lt: checkOutDate }, checkOut: { gte: checkOutDate } },
          { checkIn: { gte: checkInDate }, checkOut: { lte: checkOutDate } },
        ],
      },
      select: { roomId: true },
    });

    const bookedRoomIds = new Set(overlappingBookings.map(b => b.roomId));

    // Filter out booked rooms
    const availableRooms = allMatchingRooms.filter(room => !bookedRoomIds.has(room.id));

    // Map to a clean frontend response
    const formattedRooms = availableRooms.map(room => ({
      id: room.id,
      roomNumber: room.roomNumber,
      type: room.type,
      basePriceSingle: room.basePriceSingle.toNumber(),
      basePriceDouble: room.basePriceDouble.toNumber(),
      monthlyPriceSingle: room.monthlyPriceSingle?.toNumber(),
      monthlyPriceDouble: room.monthlyPriceDouble?.toNumber(),
      features: room.amenities.slice(0, 5).map(a => a.amenity.name),
      photos: room.photos.length > 0 ? room.photos.map(p => p.url) : ['https://picsum.photos/seed/placeholder/400/300'],
    }));

    return ok(formattedRooms);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Availability GET] Error:', error);
    return serverError();
  }
}
