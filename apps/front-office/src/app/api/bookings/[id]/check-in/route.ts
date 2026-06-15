// apps/front-office/src/app/api/bookings/[id]/check-in/route.ts
// Late Arrival Check-in Processing

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { processLateArrivalCheckIn } from '@the-rooms/db/queries/lateArrivalQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error('Unauthorized');
  const role = session.user.role;
  if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw new Error('Forbidden');
  }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const checkInSchema = z.object({
  actualCheckInTime: z.string().datetime({ message: 'Invalid check-in time' }),
  skipAutoCheckIn: z.boolean().optional().default(false),
});

// ─── POST /api/bookings/[id]/check-in ──────────────────────────────────────────
// Process check-in with late arrival detection

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    await requireStaff(session);

    const { id } = await params;
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        'VALIDATION_ERROR'
      );
    }

    const { actualCheckInTime, skipAutoCheckIn } = parsed.data;
    const userId = (session.user as { id?: string }).id;

    // Check if booking exists
    const booking = await db.booking.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!booking) {
      return notFound('Booking', 'BOOKING_NOT_FOUND');
    }

    if (booking.status !== 'CONFIRMED') {
      return badRequest(
        'Booking is not in confirmed status',
        'INVALID_STATUS'
      );
    }

    const result = await processLateArrivalCheckIn(id, {
      actualCheckInTime: new Date(actualCheckInTime),
      initiatedById: userId,
      skipAutoCheckIn,
    });

    // Audit log
    await createAuditLog({
      userId,
      bookingId: id,
      action: result.autoCheckIn ? 'AUTO_CHECKIN_LATE' : 'CHECKIN_PROCESSED',
      entity: 'booking',
      entityId: id,
      metadata: {
        actualCheckInTime,
        isLateArrival: result.isLateArrival,
        autoCheckIn: result.autoCheckIn,
        requiresManualCheckIn: result.requiresManualCheckIn,
      },
      ipAddress: getClientIp(request),
    });

    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[CHECKIN_LATE]', error);
    return serverError('Internal server error', 'INTERNAL_ERROR');
  }
}
