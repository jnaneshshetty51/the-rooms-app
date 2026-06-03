// apps/web/src/app/api/payments/indusind/initiate/route.ts
// POST /api/payments/indusind/initiate — initiate INDUSIND payment

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { getINDUSINDClient, toPaise, INDUSINDError } from '@the-rooms/payments/indusind';
import { createPayment, Prisma } from '@the-rooms/db';
import { created, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';

import { db } from '@the-rooms/db';
const InitiatePaymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  amount: z.number().positive('Amount must be positive'),
});

export async function POST(request: NextRequest) {
  try {
    // Auth is optional — public booking flow is unauthenticated.
    // The bookingId itself acts as the access token for initiating payment.
    const session = await auth();

    // Parse and validate body
    const body = await request.json();
    const { bookingId, amount } = InitiatePaymentSchema.parse(body);

    // Get booking details
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        room: true,
      },
    });

    if (!booking) {
      return badRequest('Booking not found');
    }

    // Generate order ID
    const orderId = `THR-${booking.bookingNumber}-${Date.now()}`;

    // Create payment record in PENDING state
    const payment = await createPayment({
      bookingId,
      amount: new Prisma.Decimal(amount),
      method: 'ONLINE',
      transactionId: orderId,
      status: 'PENDING',
    });

    // Initialize INDUSIND client
    const indusind = getINDUSINDClient();

    // Build return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const returnUrl = `${baseUrl}/book/confirmation?booking_id=${bookingId}`;
    const notifyUrl = `${baseUrl}/api/payments/indusind/webhook`;

    // Initiate payment with INDUSIND
    const indusindResponse = await indusind.initiatePayment({
      orderId,
      amount: toPaise(amount),
      customerEmail: booking.guest.email ?? 'guest@therooms.in',
      customerPhone: booking.guest.phone,
      customerName: booking.guest.name,
      description: `Hotel booking for Room ${booking.room.roomNumber}`,
      returnUrl,
      notifyUrl,
    });

    // Update payment record with gateway reference
    await db.payment.update({
      where: { id: payment.id },
      data: {
        gatewayRef: indusindResponse.orderId,
        gatewayResponse: indusindResponse as unknown as Prisma.JsonObject,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session?.user?.id || null,
      action: 'PAYMENT_INITIATED',
      entity: 'payment',
      entityId: payment.id,
      metadata: {
        bookingId,
        amount,
        orderId,
        gateway: 'INDUSIND',
      },
      ipAddress: getClientIp(request),
    });

    return created({
      paymentId: payment.id,
      orderId: indusindResponse.orderId,
      paymentUrl: indusindResponse.paymentUrl,
      embeddedToken: indusindResponse.embeddedToken,
      expiresAt: indusindResponse.expiresAt,
    });
  } catch (error) {
    console.error('[INDUSIND Initiate] Error:', error);

    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }

    if (error instanceof INDUSINDError) {
      // Audit log the failure
      const session = await auth();
      await createAuditLog({
        userId: session?.user?.id,
        action: 'PAYMENT_FAILED',
        entity: 'payment',
        metadata: {
          error: error.message,
          statusCode: error.statusCode,
        },
        ipAddress: getClientIp(request),
      });

      return badRequest(`Payment gateway error: ${error.message}`, 'GATEWAY_ERROR');
    }

    return serverError();
  }
}
