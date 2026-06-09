// apps/web/src/app/api/bookings/route.ts
// GET /api/bookings — list bookings with filters
// POST /api/bookings — create new booking

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { ok, created, badRequest, unauthorized, paginated, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { Prisma } from '@prisma/client';

import { db, calculateBookingPrice } from '@the-rooms/db';

// M1: Simple HTML sanitizer to prevent XSS in specialRequests
function sanitizeHTML(input: string | undefined): string | undefined {
  if (!input) return input;
  // Strip all HTML tags and encode special characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, (c) => { // Encode special chars
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&#x27;';
        case '"': return '&quot;';
        case '&': return '&amp;';
        default: return c;
      }
    })
    .substring(0, 1000); // Limit length
}

// Accept both "YYYY-MM-DD" (from <input type=date>) and full ISO datetimes
const dateString = z.string().refine(
  (v) => !isNaN(Date.parse(v)),
  { message: 'Valid date required' }
);

const CreateBookingSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required').optional(),
  roomType: z.enum(['STUDIO', 'PREMIUM']).optional(),
  checkIn: dateString,
  checkOut: dateString,
  guestsCount: z.number().int().min(1).max(4).default(1),
  guestName: z.string().min(1, 'Guest name is required'),
  guestPhone: z.string().min(10, 'Valid phone number required'),
  guestEmail: z.string().email().optional().or(z.literal('')),
  specialRequests: z.string().optional(),
  discountCode: z.string().optional(),
}).refine(data => data.roomId || data.roomType, {
  message: 'Either roomId or roomType is required',
});

const ListBookingsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']).optional(),
  guestId: z.string().optional(),
  roomId: z.string().optional(),
  checkInFrom: z.string().optional(),
  checkInTo: z.string().optional(),
});

// GET /api/bookings
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const params = ListBookingsSchema.parse(Object.fromEntries(searchParams));


    // Build where clause
    const where: Prisma.BookingWhereInput = {};

    if (params.guestId) {
      where.guestId = params.guestId;
    }
    if (params.roomId) {
      where.roomId = params.roomId;
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.checkInFrom || params.checkInTo) {
      where.checkIn = {};
      if (params.checkInFrom) {
        where.checkIn.gte = new Date(params.checkInFrom);
      }
      if (params.checkInTo) {
        where.checkIn.lte = new Date(params.checkInTo);
      }
    }

    // Role-based filtering
    const userRole = session.user.role;
    if (userRole === 'GUEST') {
      // Guests can only see their own bookings
      const guest = await db.guest.findFirst({ where: { email: session.user.email ?? '' } });
      if (guest) {
        where.guestId = guest.id;
      } else {
        where.guestId = 'none'; // No matching guest
      }
    } else if (userRole === 'FRONT_OFFICE') {
      // FO can see bookings they created
      where.createdById = session.user.id;
    }
    // ADMIN and SUPER_ADMIN can see all

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where,
        include: {
          guest: true,
          room: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      db.booking.count({ where }),
    ]);

    return paginated(bookings, total, params.page, params.pageSize);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Bookings GET] Error:', error);
    return serverError();
  }
}

// POST /api/bookings
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    // Allow unauthenticated for public booking flow from website

    const body = await request.json();
    const data = CreateBookingSchema.parse(body);


    // Validate dates
    const checkInDate = new Date(data.checkIn);
    const checkOutDate = new Date(data.checkOut);

    // Reject past dates — compare date-only (ignore time) so today is always valid
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const checkInDay = new Date(checkInDate);
    checkInDay.setHours(0, 0, 0, 0);
    if (checkInDay < todayStart) {
      return badRequest('Check-in date cannot be in the past');
    }

    if (checkOutDate <= checkInDate) {
      return badRequest('Check-out must be after check-in');
    }

    // Find or create guest first (outside transaction)
    let guest;
    if (data.guestEmail) {
      guest = await db.guest.findFirst({ where: { email: data.guestEmail } });
    }
    if (!guest) {
      guest = await db.guest.findFirst({ where: { phone: data.guestPhone } });
    }
    if (!guest) {
      guest = await db.guest.create({
        data: {
          name: data.guestName,
          phone: data.guestPhone,
          email: data.guestEmail || null,
        },
      });
    }

    // Calculate pricing (outside transaction - read-only)
    const pricing = await calculateBookingPrice(
      data.roomId || '', // roomId may not be known yet
      checkInDate,
      checkOutDate,
      data.guestsCount,
      'DAILY',
      data.discountCode
    );

    // Generate booking number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db.booking.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    });
    const bookingNumber = `BKN-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // H2: Use SERIALIZABLE transaction to prevent race conditions
    // This wraps the entire booking creation including room assignment and availability check
    const booking = await db.$transaction(async (tx) => {
      // Determine the room to use - either provided roomId or auto-assign from roomType
      let actualRoomId: string;
      let room: { id: string; roomNumber: string; type: string } | null = null;

      if (data.roomId) {
        // Use the provided room ID
        actualRoomId = data.roomId;
        room = await tx.room.findUnique({ where: { id: actualRoomId } });
        if (!room) {
          throw new Error('Room not found');
        }
      } else if (data.roomType) {
        // Auto-assign an available room of the specified type
        // Find rooms of this type that are not blocked/maintenance
        const availableRooms = await tx.room.findMany({
          where: {
            type: data.roomType,
            status: { notIn: ['MAINTENANCE', 'BLOCKED'] },
          },
        });

        // Find bookings that overlap with requested dates
        const overlappingBookings = await tx.booking.findMany({
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            roomId: { in: availableRooms.map(r => r.id) },
            OR: [
              { checkIn: { lte: checkInDate }, checkOut: { gt: checkInDate } },
              { checkIn: { lt: checkOutDate }, checkOut: { gte: checkOutDate } },
              { checkIn: { gte: checkInDate }, checkOut: { lte: checkOutDate } },
            ],
          },
          select: { roomId: true },
        });

        const bookedRoomIds = new Set(overlappingBookings.map(b => b.roomId));
        const availableRoom = availableRooms.find(r => !bookedRoomIds.has(r.id));

        if (!availableRoom) {
          throw new Error(`No ${data.roomType} rooms available for the selected dates`);
        }

        actualRoomId = availableRoom.id;
        room = availableRoom;
      } else {
        throw new Error('Either roomId or roomType is required');
      }

      // Re-check for overlapping bookings on the actual room (within transaction)
      const overlapping = await tx.booking.findFirst({
        where: {
          roomId: actualRoomId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          OR: [
            { checkIn: { lte: checkInDate }, checkOut: { gt: checkInDate } },
            { checkIn: { lt: checkOutDate }, checkOut: { gte: checkOutDate } },
            { checkIn: { gte: checkInDate }, checkOut: { lte: checkOutDate } },
          ],
        },
      });

      if (overlapping) {
        throw new Error('Room is already booked for these dates');
      }

      // Create the booking
      return tx.booking.create({
        data: {
          bookingNumber,
          guestId: guest.id,
          roomId: actualRoomId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guestsCount: data.guestsCount,
          bookingType: 'DAILY',
          bookingSource: 'WEBSITE',
          status: 'CONFIRMED',
          paymentStatus: 'PENDING',
          baseAmount: new Prisma.Decimal(pricing.baseAmount),
          discountAmount: new Prisma.Decimal(pricing.discountAmount),
          extrasAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(pricing.totalAmount),
          specialRequests: sanitizeHTML(data.specialRequests),
          discountCode: data.discountCode,
          createdById: session?.user?.id || null,
        },
        include: {
          guest: true,
          room: true,
        },
      });
    }, {
      isolationLevel: 'Serializable',
      timeout: 15000,
    });

    // Audit log (outside transaction - non-critical)
    await createAuditLog({
      userId: session?.user?.id || null,
      action: 'CREATE',
      entity: 'booking',
      entityId: booking.id,
      metadata: {
        bookingNumber,
        roomId: data.roomId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        totalAmount: pricing.totalAmount,
      },
      ipAddress: getClientIp(request),
    });

    return created(booking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found') || message.includes('not available') || message.includes('already booked')) {
      return badRequest(message);
    }
    console.error('[Bookings POST] Error:', error);
    return serverError();
  }
}