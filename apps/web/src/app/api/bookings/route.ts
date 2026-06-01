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
const CreateBookingSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  checkIn: z.string().datetime({ message: 'Valid check-in date required' }),
  checkOut: z.string().datetime({ message: 'Valid check-out date required' }),
  guestsCount: z.number().int().min(1).max(4).default(1),
  guestName: z.string().min(1, 'Guest name is required'),
  guestPhone: z.string().min(10, 'Valid phone number required'),
  guestEmail: z.string().email().optional().or(z.literal('')),
  specialRequests: z.string().optional(),
  discountCode: z.string().optional(),
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
    if (!session?.user) {
      return unauthorized();
    }

    const body = await request.json();
    const data = CreateBookingSchema.parse(body);


    // Validate dates
    const checkInDate = new Date(data.checkIn);
    const checkOutDate = new Date(data.checkOut);

    if (checkOutDate <= checkInDate) {
      return badRequest('Check-out must be after check-in');
    }

    // Verify room exists and is available
    const room = await db.room.findUnique({
      where: { id: data.roomId },
    });

    if (!room) {
      return badRequest('Room not found');
    }

    // Check for overlapping bookings
    const overlapping = await db.booking.findFirst({
      where: {
        roomId: data.roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
          { checkIn: { lte: checkInDate }, checkOut: { gt: checkInDate } },
          { checkIn: { lt: checkOutDate }, checkOut: { gte: checkOutDate } },
          { checkIn: { gte: checkInDate }, checkOut: { lte: checkOutDate } },
        ],
      },
    });

    if (overlapping) {
      return badRequest('Room is already booked for these dates');
    }

    // Find or create guest
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

    // Calculate pricing
    
    const pricing = await calculateBookingPrice(
      data.roomId,
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

    // Create booking
    const booking = await db.booking.create({
      data: {
        bookingNumber,
        guestId: guest.id,
        roomId: data.roomId,
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
        specialRequests: data.specialRequests,
        discountCode: data.discountCode,
        createdById: session.user.id,
      },
      include: {
        guest: true,
        room: true,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
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
    console.error('[Bookings POST] Error:', error);
    return serverError();
  }
}