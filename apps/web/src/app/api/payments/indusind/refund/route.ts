// apps/web/src/app/api/payments/indusind/refund/route.ts
// POST /api/payments/indusind/refund — initiate refund (admin only)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { getINDUSINDClient, toPaise, INDUSINDError } from '@the-rooms/payments/indusind';
import { badRequest, forbidden, notFound, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { Prisma } from '@prisma/client';
import { sendRefundNotification } from '@the-rooms/email';

import { db } from '@the-rooms/db';
const RefundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().min(10, 'Please provide a detailed reason (at least 10 characters)'),
  refundAmount: z.number().positive('Refund amount must be positive').optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check — only ADMIN and SUPER_ADMIN
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return forbidden('Only administrators can process refunds');
    }

    // Parse and validate body
    const body = await request.json();
    const { paymentId, reason, refundAmount } = RefundSchema.parse(body);

    // Get payment from DB
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: { guest: true },
        },
      },
    });

    if (!payment) {
      return notFound('Payment');
    }

    // Validate payment state
    if (payment.status !== 'PAID') {
      return badRequest('Only paid payments can be refunded');
    }

    if (payment.refundStatus === 'PROCESSED' || payment.refundStatus === 'COMPLETED') {
      return badRequest('This payment has already been refunded');
    }

    // Check refund amount
    const maxRefundAmount = Number(payment.amount);
    const actualRefundAmount = refundAmount ?? maxRefundAmount;

    if (actualRefundAmount > maxRefundAmount) {
      return badRequest(`Refund amount cannot exceed ${maxRefundAmount}`);
    }

    // Initiate refund with INDUSIND
    const indusind = getINDUSINDClient();
    let indusindRefund;

    try {
      indusindRefund = await indusind.refundPayment({
        transactionId: payment.gatewayRef ?? payment.transactionId ?? '',
        refundAmount: toPaise(actualRefundAmount),
        reason,
        refundReference: `THR-REF-${payment.id.slice(-8)}`,
      });
    } catch (error) {
      // If INDUSIND refund fails, we can still record internally
      console.error('[Refund] INDUSIND error:', error);

      if (error instanceof INDUSINDError && error.statusCode !== 400) {
        // Non-recoverable INDUSIND error
        return badRequest(`Refund gateway error: ${error.message}`, 'GATEWAY_ERROR');
      }
      // For certain errors, continue with internal refund record
      indusindRefund = null;
    }

    // Update payment with refund info
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundReason: reason,
        refundAmount: new Prisma.Decimal(actualRefundAmount),
        refundStatus: indusindRefund?.status === 'SUCCESS' ? 'PROCESSED' : 'PENDING',
        gatewayResponse: indusindRefund as unknown as Prisma.JsonObject ?? { internal: true },
      },
    });

    // Update booking
    await db.booking.update({
      where: { id: payment.bookingId },
      data: {
        paymentStatus: 'REFUNDED',
        status: 'CANCELLED', // Refunded bookings are effectively cancelled
      },
    });

    // Send refund notification to guest
    const guestEmail = payment.booking.guest.email;
    if (guestEmail) {
      await sendRefundNotification(guestEmail, payment.booking.bookingNumber, actualRefundAmount).catch(
        (e) => console.error('[Refund] Email error:', e)
      );
    }

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'REFUND_INITIATED',
      entity: 'payment',
      entityId: paymentId,
      metadata: {
        bookingId: payment.bookingId,
        amount: actualRefundAmount,
        reason,
        refundId: indusindRefund?.refundId,
        status: indusindRefund?.status ?? 'PENDING_INTERNAL',
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      data: {
        refundId: indusindRefund?.refundId ?? `INT-${Date.now()}`,
        paymentId,
        status: indusindRefund?.status ?? 'PENDING',
        refundAmount: actualRefundAmount,
        initiatedAt: new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Refund] Error:', error);

    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }

    return serverError();
  }
}
