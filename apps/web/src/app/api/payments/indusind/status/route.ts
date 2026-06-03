// apps/web/src/app/api/payments/indusind/status/route.ts
// GET /api/payments/indusind/status — check payment status

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { getINDUSINDClient, INDUSINDError } from '@the-rooms/payments/indusind';
import { ok, badRequest, notFound, unauthorized, serverError } from '@the-rooms/api';

import { db } from '@the-rooms/db';
const StatusQuerySchema = z.object({
  transactionId: z.string().optional(),
  bookingId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const query = StatusQuerySchema.parse({
      transactionId: searchParams.get('transactionId'),
      bookingId: searchParams.get('bookingId'),
    });

    if (!query.transactionId && !query.bookingId) {
      return badRequest('Either transactionId or bookingId is required');
    }

    // Get booking/payment from DB
    let payment;

    if (query.bookingId) {
      payment = await db.payment.findFirst({
        where: { bookingId: query.bookingId },
        orderBy: { createdAt: 'desc' },
        include: { booking: { include: { guest: true } } },
      });
    } else {
      payment = await db.payment.findFirst({
        where: { transactionId: query.transactionId },
        include: { booking: { include: { guest: true } } },
      });
    }

    if (!payment) {
      return notFound('Payment');
    }

    // Authorization: user can only check their own booking's payment
    // Admins and FO staff can check any
    const userRole = session.user.role;
    const isStaff = ['SUPER_ADMIN', 'ADMIN', 'FRONT_OFFICE'].includes(userRole);
    const isOwnBooking = payment.booking.guest.email === session.user.email;

    if (!isStaff && !isOwnBooking) {
      return unauthorized('You can only view your own payment status');
    }

    // Check with INDUSIND if payment is still pending
    let gatewayStatus;
    if (payment.status === 'PENDING') {
      const indusind = getINDUSINDClient();
      try {
        gatewayStatus = await indusind.checkPaymentStatus({
          transactionId: payment.transactionId ?? undefined,
          orderId: payment.gatewayRef ?? undefined,
        });
      } catch (error) {
        // INDUSIND might not have the order yet, use DB status
        console.warn('[Payment Status] INDUSIND check failed:', error);
      }
    }

    return ok({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      status: payment.status,
      amount: Number(payment.amount),
      transactionId: payment.transactionId,
      gatewayRef: payment.gatewayRef,
      gatewayStatus: gatewayStatus?.status,
      paidAt: payment.status === 'PAID' ? payment.createdAt : undefined,
      paymentMethod: payment.method,
    });
  } catch (error) {
    console.error('[Payment Status] Error:', error);

    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }

    if (error instanceof INDUSINDError) {
      return badRequest(`Gateway error: ${error.message}`, 'GATEWAY_ERROR');
    }

    return serverError();
  }
}
