// apps/web/src/app/api/guests/search/route.ts
// GET /api/guests/search?q=query — search guests by name, phone, or email

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, unauthorized } from '@the-rooms/api';

import { db } from '@the-rooms/db';
const SearchSchema = z.object({
  q: z.string().min(1),
});

// GET /api/guests/search
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const params = SearchSchema.parse(Object.fromEntries(searchParams));


    const guests = await db.guest.findMany({
      where: {
        OR: [
          { name: { contains: params.q, mode: 'insensitive' } },
          { phone: { contains: params.q, mode: 'insensitive' } },
          { email: { contains: params.q, mode: 'insensitive' } },
        ],
      },
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
          select: {
            id: true,
            bookingNumber: true,
            checkIn: true,
            checkOut: true,
            status: true,
            room: { select: { roomNumber: true, type: true } },
          },
          orderBy: { checkIn: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return ok(guests);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Search Guests] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
