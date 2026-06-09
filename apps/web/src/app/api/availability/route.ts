import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { getRedis } from '@/lib/redis';

const CACHE_TTL = 300; // 5 minutes

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

    // ─── Redis cache lookup ────────────────────────────────────────────────
    const cacheKey = `availability:${params.checkIn.slice(0, 10)}:${params.checkOut.slice(0, 10)}:${params.guestsCount}:${params.type ?? 'ALL'}`;
    const redis = getRedis();
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return ok(JSON.parse(cached));
      } catch {
        // Redis miss or error — fall through to DB
      }
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

    // Load room type profiles for images/description/features
    type TypeProfile = { type: string; title: string; description: string | null; features: string[]; images: { url: string }[] };
    const dbAny = db as unknown as Record<string, { findMany: (args: unknown) => Promise<unknown> }>;
    const typeProfiles = (await dbAny.roomTypeProfile.findMany({
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    })) as TypeProfile[];
    const profileMap = Object.fromEntries(typeProfiles.map(p => [p.type, p]));

    // Get pricing from first available room of each type
    const studioSample = allMatchingRooms.find(r => r.type === 'STUDIO');
    const premiumSample = allMatchingRooms.find(r => r.type === 'PREMIUM');

    // Group by room type and aggregate data
    const roomTypes = [
      {
        type: 'STUDIO',
        title: profileMap['STUDIO']?.title ?? 'Studio Room',
        description: profileMap['STUDIO']?.description ?? 'Perfect for solo travellers and digital nomads. All essentials included.',
        features: profileMap['STUDIO']?.features?.length ? profileMap['STUDIO'].features : ['Queen Bed', 'Work Desk', 'WiFi', 'AC'],
        availableCount: showStudio ? availableRooms.filter(r => r.type === 'STUDIO').length : 0,
        basePriceSingle: studioSample?.basePriceSingle.toNumber() ?? 999,
        basePriceDouble: studioSample?.basePriceDouble.toNumber() ?? 1799,
        monthlyPriceSingle: studioSample?.monthlyPriceSingle?.toNumber() ?? 19999,
        monthlyPriceDouble: studioSample?.monthlyPriceDouble?.toNumber() ?? 29999,
        photos: profileMap['STUDIO']?.images.map(i => i.url) ?? [],
      },
      {
        type: 'PREMIUM',
        title: profileMap['PREMIUM']?.title ?? 'Premium Room',
        description: profileMap['PREMIUM']?.description ?? 'Spacious rooms with premium amenities. Ideal for couples and business travellers.',
        features: profileMap['PREMIUM']?.features?.length ? profileMap['PREMIUM'].features : ['King Bed', 'Mini Bar', 'City View', 'Room Service'],
        availableCount: showPremium ? availableRooms.filter(r => r.type === 'PREMIUM').length : 0,
        basePriceSingle: premiumSample?.basePriceSingle.toNumber() ?? 1999,
        basePriceDouble: premiumSample?.basePriceDouble.toNumber() ?? 2999,
        monthlyPriceSingle: premiumSample?.monthlyPriceSingle?.toNumber() ?? 39999,
        monthlyPriceDouble: premiumSample?.monthlyPriceDouble?.toNumber() ?? 49999,
        photos: profileMap['PREMIUM']?.images.map(i => i.url) ?? [],
      },
    ].filter(rt => rt.availableCount > 0);

    // ─── Cache the result ──────────────────────────────────────────────────
    if (redis && roomTypes.length > 0) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(roomTypes));
      } catch {
        // Cache write failure is non-fatal
      }
    }

    return ok(roomTypes);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Availability GET] Error:', error);
    return serverError();
  }
}
