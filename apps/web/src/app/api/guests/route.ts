// apps/web/src/app/api/guests/route.ts
// GET /api/guests — list/search guests
// POST /api/guests — create guest

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { ok, created, badRequest, unauthorized, paginated } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { db } from '@the-rooms/db';
import type { Prisma } from '@prisma/client';

const CreateGuestSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10).max(15),
  email: z.string().email().optional(),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  companyName: z.string().optional(),
  notes: z.string().optional(),
});

const ListGuestsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

// GET /api/guests
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const params = ListGuestsSchema.parse(Object.fromEntries(searchParams));

    const where: Prisma.GuestWhereInput = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [guests, total] = await Promise.all([
      db.guest.findMany({
        where,
        include: {
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      db.guest.count({ where }),
    ]);

    return paginated(guests, total, params.page, params.pageSize);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[List Guests] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/guests
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const userRole = session.user.role;
    if (!['SUPER_ADMIN', 'ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateGuestSchema.parse(body);

    // Check for duplicate phone
    const existing = await db.guest.findFirst({
      where: { phone: data.phone },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Guest with this phone number already exists', code: 'DUPLICATE_PHONE' },
        { status: 409 }
      );
    }

    // Check for duplicate email if provided
    if (data.email) {
      const existingEmail = await db.guest.findFirst({
        where: { email: data.email },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Guest with this email already exists', code: 'DUPLICATE_EMAIL' },
          { status: 409 }
        );
      }
    }

    const guest = await db.guest.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        alternatePhone: data.alternatePhone,
        address: data.address,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        companyName: data.companyName,
        notes: data.notes,
      },
      include: {
        _count: { select: { bookings: true } },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'guest',
      entityId: guest.id,
      metadata: {
        name: guest.name,
        phone: guest.phone,
      },
      ipAddress: getClientIp(request),
    });

    return created(guest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Create Guest] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
