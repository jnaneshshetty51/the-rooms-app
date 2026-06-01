// apps/web/src/app/api/payments/idfc/initiate/route.ts
// POST /api/payments/idfc/initiate — initiate IDFC payment

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { getIDFCClient, toPaise, IDFCError } from '@the-rooms/payments/idfc';
import { createPayment, updatePaymentStatus } from '@the-rooms/db';
import { created, badRequest, serverError, unauthorized } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { Prisma } from '@prisma/client';

import { db } from '@the-rooms/db';
const InitiatePaymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  amount: z.number().positive('Amount must be positive'),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check — any authenticated user can initiate payment
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

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

    // Initialize IDFC client
    const idfc = getIDFCClient();

    // Build return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const returnUrl = `${baseUrl}/book/confirmation?booking_id=${bookingId}`;
    const notifyUrl = `${baseUrl}/api/payments/idfc/webhook`;

    // Initiate payment with IDFC
    const idfcResponse = await idfc.initiatePayment({
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
        gatewayRef: idfcResponse.orderId,
        gatewayResponse: idfcResponse as unknown as Prisma.JsonObject,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'PAYMENT_INITIATED',
      entity: 'payment',
      entityId: payment.id,
      metadata: {
        bookingId,
        amount,
        orderId,
        gateway: 'IDFC',
      },
      ipAddress: getClientIp(request),
    });

    return created({
      paymentId: payment.id,
      orderId: idfcResponse.orderId,
      paymentUrl: idfcResponse.paymentUrl,
      embeddedToken: idfcResponse.embeddedToken,
      expiresAt: idfcResponse.expiresAt,
    });
  } catch (error) {
    console.error('[IDFC Initiate] Error:', error);

    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }

    if (error instanceof IDFCError) {
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
