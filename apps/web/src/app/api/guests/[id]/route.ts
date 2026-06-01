// apps/web/src/app/api/guests/[id]/route.ts
// GET /api/guests/:id
// PATCH /api/guests/:id

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { ok, notFound, badRequest, unauthorized, forbidden } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';

import { db } from '@the-rooms/db';
const UpdateGuestSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).max(15).optional(),
  email: z.string().email().optional().nullable(),
  alternatePhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/guests/:id
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const { id } = await params;

    const guest = await db.guest.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            room: true,
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!guest) {
      return notFound('Guest');
    }

    return ok(guest);
  } catch (error) {
    console.error('[Get Guest] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/guests/:id
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const userRole = session.user.role;
    if (!['SUPER_ADMIN', 'ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
      return forbidden();
    }

    const { id } = await params;
    const body = await request.json();
    const data = UpdateGuestSchema.parse(body);


    const existing = await db.guest.findUnique({ where: { id } });
    if (!existing) {
      return notFound('Guest');
    }

    // Check for duplicate phone if changing
    if (data.phone && data.phone !== existing.phone) {
      const duplicatePhone = await db.guest.findFirst({
        where: { phone: data.phone, id: { not: id } },
      });
      if (duplicatePhone) {
        return badRequest('Another guest with this phone already exists');
      }
    }

    // Check for duplicate email if changing
    if (data.email && data.email !== existing.email) {
      const duplicateEmail = await db.guest.findFirst({
        where: { email: data.email },
      });
      if (duplicateEmail) {
        return badRequest('Another guest with this email already exists');
      }
    }

    const guest = await db.guest.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.alternatePhone !== undefined && { alternatePhone: data.alternatePhone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.dateOfBirth !== undefined && {
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        _count: { select: { bookings: true } },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'guest',
      entityId: id,
      metadata: {
        changes: data,
      },
      ipAddress: getClientIp(request),
    });

    return ok(guest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Update Guest] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
