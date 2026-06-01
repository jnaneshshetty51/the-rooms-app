// apps/web/src/app/api/rooms/route.ts
// GET /api/rooms — list all rooms
// POST /api/rooms — create room (admin only)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { ok, created, badRequest, unauthorized, forbidden, paginated } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { Prisma } from '@prisma/client';

import { db } from '@the-rooms/db';
const CreateRoomSchema = z.object({
  roomNumber: z.string().min(1),
  type: z.enum(['STUDIO', 'PREMIUM']),
  floor: z.number().int().positive(),
  basePriceSingle: z.number().positive(),
  basePriceDouble: z.number().positive(),
  monthlyPriceSingle: z.number().optional(),
  monthlyPriceDouble: z.number().optional(),
  maxOccupancy: z.number().int().min(1).max(4).default(2),
  sizeSqft: z.number().int().positive().optional(),
  description: z.string().optional(),
});

const ListRoomsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  type: z.enum(['STUDIO', 'PREMIUM']).optional(),
  status: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED']).optional(),
  floor: z.coerce.number().int().optional(),
});

// GET /api/rooms
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = ListRoomsSchema.parse(Object.fromEntries(searchParams));


    const where: Prisma.RoomWhereInput = {};

    if (params.type) {
      where.type = params.type;
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.floor) {
      where.floor = params.floor;
    }

    const [rooms, total] = await Promise.all([
      db.room.findMany({
        where,
        include: {
          photos: { orderBy: { sortOrder: 'asc' } },
          amenities: { include: { amenity: true } },
        },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      db.room.count({ where }),
    ]);

    return paginated(rooms, total, params.page, params.pageSize);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[List Rooms] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rooms
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const userRole = session.user.role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return forbidden('Only administrators can create rooms');
    }

    const body = await request.json();
    const data = CreateRoomSchema.parse(body);


    // Check if room number already exists
    const existing = await db.room.findUnique({
      where: { roomNumber: data.roomNumber },
    });

    if (existing) {
      return badRequest(`Room ${data.roomNumber} already exists`);
    }

    const room = await db.room.create({
      data: {
        roomNumber: data.roomNumber,
        type: data.type,
        floor: data.floor,
        status: 'VACANT',
        basePriceSingle: new Prisma.Decimal(data.basePriceSingle),
        basePriceDouble: new Prisma.Decimal(data.basePriceDouble),
        monthlyPriceSingle: data.monthlyPriceSingle
          ? new Prisma.Decimal(data.monthlyPriceSingle)
          : null,
        monthlyPriceDouble: data.monthlyPriceDouble
          ? new Prisma.Decimal(data.monthlyPriceDouble)
          : null,
        maxOccupancy: data.maxOccupancy,
        sizeSqft: data.sizeSqft,
        description: data.description,
      },
      include: {
        photos: true,
        amenities: { include: { amenity: true } },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'room',
      entityId: room.id,
      metadata: {
        roomNumber: room.roomNumber,
        type: room.type,
        floor: room.floor,
      },
      ipAddress: getClientIp(request),
    });

    return created(room);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Create Room] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
