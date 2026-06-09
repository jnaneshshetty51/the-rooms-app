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

    // Determine which room types to show
    const showStudio = !params.type || params.type === 'STUDIO' || params.type === 'MONTHLY';
    const showPremium = !params.type || params.type === 'PREMIUM';

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

    // Group by room type and aggregate data
    const roomTypes = [
      {
        type: 'STUDIO',
        title: 'Studio Room',
        description: 'Perfect for solo travellers and digital nomads. All essentials included.',
        features: ['Queen Bed', 'Work Desk', 'WiFi', 'AC'],
        availableCount: showStudio ? availableRooms.filter(r => r.type === 'STUDIO').length : 0,
        basePriceSingle: 999,
        basePriceDouble: 1799,
        monthlyPriceSingle: 19999,
        monthlyPriceDouble: 29999,
        photos: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80'],
      },
      {
        type: 'PREMIUM',
        title: 'Premium Room',
        description: 'Spacious rooms with premium amenities. Ideal for couples and business travellers.',
        features: ['King Bed', 'Mini Bar', 'City View', 'Room Service'],
        availableCount: showPremium ? availableRooms.filter(r => r.type === 'PREMIUM').length : 0,
        basePriceSingle: 1999,
        basePriceDouble: 2999,
        monthlyPriceSingle: 39999,
        monthlyPriceDouble: 49999,
        photos: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80'],
      },
    ].filter(rt => rt.availableCount > 0);

    return ok(roomTypes);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Availability GET] Error:', error);
    return serverError();
  }
}
