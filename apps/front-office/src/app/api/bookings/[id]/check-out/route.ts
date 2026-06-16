// apps/front-office/src/app/api/bookings/[id]/check-out/route.ts
// Check-out Processing with Late Checkout Fee and Pending Dues

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { calculateLateCheckoutFee, applyLateCheckoutFee } from '@the-rooms/db/queries/lateCheckoutQueries';
import { getDamageAssessmentsByBooking } from '@the-rooms/db/queries/damageAssessmentQueries';

// ─── Auth Helper ───────────────────────────────────────────────────────────────

async function requireStaff(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error('Unauthorized');
  const role = session.user.role;
  if (!role || !['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw new Error('Forbidden');
  }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const checkOutSchema = z.object({
  actualCheckOutTime: z.string().datetime({ message: 'Invalid check-out time' }).optional(),
  allowWithPendingDues: z.boolean().optional().default(false),
  skipLateFee: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

// ─── GET /api/bookings/[id]/check-out ──────────────────────────────────────────
// Get checkout details including pending dues and late fee calculation

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    await requireStaff(session);

    const { id } = await params;

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        room: true,
        folio: {
          include: {
            charges: true,
            payments: true,
          },
        },
      },
    });

    if (!booking) {
      return notFound('Booking', 'BOOKING_NOT_FOUND');
    }

    if (booking.status !== 'CHECKED_IN') {
      return badRequest('Booking is not checked in', 'INVALID_STATUS');
    }

    // Calculate late checkout fee
    const lateCheckoutFee = await calculateLateCheckoutFee(id);

    // Get damage assessments
    const damageAssessments = await getDamageAssessmentsByBooking(id);

    // Calculate total charges and payments
    let totalCharges = booking.baseAmount.toNumber();
    totalCharges += booking.extrasAmount?.toNumber() || 0;
    totalCharges += booking.damageChargesTotal?.toNumber() || 0;
    totalCharges -= booking.discountAmount.toNumber();

    let totalPayments = 0;
    if (booking.folio) {
      for (const payment of booking.folio.payments) {
        totalPayments += payment.amount.toNumber();
      }
    }

    const pendingDues = Math.max(0, totalCharges - totalPayments);

    return ok({
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        checkOut: booking.checkOut,
        status: booking.status,
        baseAmount: booking.baseAmount,
        extrasAmount: booking.extrasAmount,
        discountAmount: booking.discountAmount,
        damageChargesTotal: booking.damageChargesTotal,
      },
      guest: {
        id: booking.guest.id,
        name: booking.guest.name,
        phone: booking.guest.phone,
      },
      room: {
        id: booking.room.id,
        roomNumber: booking.room.roomNumber,
      },
      folio: booking.folio ? {
        totalCharges: booking.folio.charges.reduce((sum, c) => sum + c.totalAmount.toNumber(), 0),
        totalPayments: booking.folio.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0),
        chargesCount: booking.folio.charges.length,
        paymentsCount: booking.folio.payments.length,
      } : null,
      financialSummary: {
        totalCharges,
        totalPayments,
        pendingDues,
      },
      lateCheckoutFee,
      damageAssessments: damageAssessments.map(d => ({
        id: d.id,
        description: d.description,
        damageType: d.damageType,
        amount: d.amount,
        assessedAt: d.assessedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[CHECKOUT_GET]', error);
    return serverError('Internal server error', 'INTERNAL_ERROR');
  }
}

// ─── POST /api/bookings/[id]/check-out ────────────────────────────────────────
// Process check-out

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    await requireStaff(session);

    const { id } = await params;
    const body = await request.json();
    const parsed = checkOutSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        'VALIDATION_ERROR'
      );
    }

    const { actualCheckOutTime, allowWithPendingDues, skipLateFee, notes } = parsed.data;
    const userId = (session.user as { id?: string }).id;

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        room: true,
        folio: {
          include: {
            charges: true,
            payments: true,
          },
        },
      },
    });

    if (!booking) {
      return notFound('Booking', 'BOOKING_NOT_FOUND');
    }

    if (booking.status !== 'CHECKED_IN') {
      return badRequest('Booking is not checked in', 'INVALID_STATUS');
    }

    // Calculate total charges and payments
    let totalCharges = booking.baseAmount.toNumber();
    totalCharges += booking.extrasAmount?.toNumber() || 0;
    totalCharges += booking.damageChargesTotal?.toNumber() || 0;
    totalCharges -= booking.discountAmount.toNumber();

    let totalPayments = 0;
    if (booking.folio) {
      for (const payment of booking.folio.payments) {
        totalPayments += payment.amount.toNumber();
      }
    }

    const pendingDues = Math.max(0, totalCharges - totalPayments);

    // Check pending dues
    if (pendingDues > 0 && !allowWithPendingDues) {
      return badRequest(
        `Booking has pending dues of ₹${pendingDues.toFixed(2)}. Authorize checkout with pending dues to proceed.`,
        'PENDING_DUES'
      );
    }

    // Apply late checkout fee if applicable
    let lateFeeApplied = false;
    let lateFeeAmount = 0;

    if (!skipLateFee) {
      const lateCheckoutFee = await calculateLateCheckoutFee(id);

      if (lateCheckoutFee.eligible && lateCheckoutFee.fee > 0) {
        const feeResult = await applyLateCheckoutFee({
          bookingId: id,
          fee: lateCheckoutFee.fee,
          appliedById: userId!,
          description: `Late checkout fee (${lateCheckoutFee.chargeType})`,
        });

        lateFeeApplied = true;
        lateFeeAmount = feeResult.charge.totalAmount.toNumber();
      }
    }

    // Update booking status to CHECKED_OUT
    const updatedBooking = await db.booking.update({
      where: { id },
      data: {
        status: 'CHECKED_OUT',
        checkoutType: lateFeeApplied ? 'LATE' : 'STANDARD',
        checkOutTime: actualCheckOutTime ? new Date(actualCheckOutTime) : new Date(),
        pendingDues: pendingDues,
      },
    });

    // Update room status to VACANT
    await db.room.update({
      where: { id: booking.roomId },
      data: {
        status: 'VACANT',
      },
    });

    // Audit log
    await createAuditLog({
      userId,
      bookingId: id,
      action: lateFeeApplied ? 'CHECKOUT_PROCESSED_LATE' : 'CHECKOUT_PROCESSED',
      entity: 'booking',
      entityId: id,
      metadata: {
        totalCharges,
        totalPayments,
        pendingDues,
        lateFeeApplied,
        lateFeeAmount,
        allowWithPendingDues,
        notes,
      },
      ipAddress: getClientIp(request),
    });

    return ok({
      message: 'Check-out processed successfully',
      booking: {
        id: updatedBooking.id,
        bookingNumber: updatedBooking.bookingNumber,
        status: updatedBooking.status,
        checkoutType: updatedBooking.checkoutType,
        checkOutTime: updatedBooking.checkOutTime,
        pendingDues: updatedBooking.pendingDues,
      },
      room: {
        id: booking.room.id,
        roomNumber: booking.room.roomNumber,
        status: 'VACANT',
      },
      financialSummary: {
        totalCharges,
        totalPayments,
        pendingDues,
      },
      lateFeeApplied,
      lateFeeAmount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[CHECKOUT_POST]', error);
    return serverError('Internal server error', 'INTERNAL_ERROR');
  }
}
