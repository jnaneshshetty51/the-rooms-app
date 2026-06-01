// apps/web/src/app/api/payments/idfc-webhook/route.ts
// IDFC Payment Gateway Webhook Handler

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@the-rooms/db';
import { getIDFCClient, IDFCError, fromPaise } from '@the-rooms/payments/idfc';
import { generateInvoice } from '@the-rooms/db';
import { sendPaymentSuccess } from '@the-rooms/email';

// ─── Webhook Payload Schema ─────────────────────────────────────────────────

const WebhookPayloadSchema = z.object({
  orderId: z.string(),
  transactionId: z.string(),
  status: z.enum(['SUCCESS', 'FAILED', 'CANCELLED', 'PENDING']),
  amount: z.number(),
  currency: z.string().default('INR'),
  paymentMethod: z.string().optional(),
  gatewayTransactionId: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  checksum: z.string(),
});

// ─── Webhook Handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate payload
    const payload = WebhookPayloadSchema.parse(body);

    // Verify webhook signature
    const idfc = getIDFCClient();
    const isValid = idfc.verifyWebhookChecksum(payload, payload.checksum);
    
    if (!isValid) {
      console.error('[IDFC Webhook] Invalid checksum:', payload);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Find payment by order ID (booking ID)
    const booking = await db.booking.findFirst({
      where: { bookingNumber: payload.orderId },
      include: {
        guest: true,
        room: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      console.error('[IDFC Webhook] Booking not found:', payload.orderId);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const payment = booking.payments[0];

    if (!payment) {
      console.error('[IDFC Webhook] Payment not found for booking:', booking.id);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Already processed this status
    if (payment.status === 'PAID' && payload.status === 'SUCCESS') {
      return NextResponse.json({ received: true, message: 'Already processed' });
    }

    // ─── Handle Payment Status ───────────────────────────────────────────────

    switch (payload.status) {
      case 'SUCCESS':
        await handlePaymentSuccess(
          booking.id,
          payment.id,
          booking.bookingNumber,
          booking.guest.email ?? '',
          booking.guest.name ?? 'Guest',
          booking.room?.type ?? 'STUDIO',
          booking.room?.roomNumber ?? 'TBD',
          payload
        );
        break;

      case 'FAILED':
        await handlePaymentFailed(payment.id, payload);
        break;

      case 'CANCELLED':
        await handlePaymentCancelled(payment.id, payload);
        break;

      case 'PENDING':
        // No action needed for pending payments
        console.log('[IDFC Webhook] Payment pending:', payload.transactionId);
        break;

      default:
        console.warn('[IDFC Webhook] Unknown status:', payload.status);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[IDFC Webhook] Invalid payload:', error.errors);
      return NextResponse.json({ error: 'Invalid payload', details: error.errors }, { status: 400 });
    }

    if (error instanceof IDFCError) {
      console.error('[IDFC Webhook] IDFC Error:', error.message, error.statusCode);
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('[IDFC Webhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Payment Status Handlers ────────────────────────────────────────────────

async function handlePaymentSuccess(
  bookingId: string,
  paymentId: string,
  bookingNumber: string,
  guestEmail: string,
  guestName: string,
  roomType: string,
  roomNumber: string,
  payload: z.infer<typeof WebhookPayloadSchema>
) {
  // Update payment status
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: 'PAID',
      gatewayRef: payload.gatewayTransactionId,
      gatewayResponse: payload as unknown as Prisma.InputJsonValue,
      transactionId: payload.transactionId,
    },
  });

  // Update booking payment status
  await db.booking.update({
    where: { id: bookingId },
    data: { paymentStatus: 'PAID' },
  });

  // Generate invoice
  const invoice = await generateInvoice(paymentId, bookingId);

  // Send confirmation email
  try {
    await sendPaymentSuccess({
      to: guestEmail,
      guestName,
      bookingNumber,
      roomType,
      roomNumber,
      amount: fromPaise(payload.amount),
      transactionId: payload.transactionId,
      paymentMethod: payload.paymentMethod || 'Online',
      checkIn: '', // Would need to fetch booking for these
      checkOut: '',
    });
  } catch (emailError) {
    console.error('[IDFC Webhook] Failed to send confirmation email:', emailError);
    // Don't fail the webhook for email errors
  }

  console.log('[IDFC Webhook] Payment SUCCESS:', {
    bookingId,
    paymentId,
    transactionId: payload.transactionId,
    amount: fromPaise(payload.amount),
  });
}

async function handlePaymentFailed(
  paymentId: string,
  payload: z.infer<typeof WebhookPayloadSchema>
) {
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: 'FAILED',
      gatewayResponse: payload as unknown as Prisma.InputJsonValue,
      transactionId: payload.transactionId,
    },
  });

  console.log('[IDFC Webhook] Payment FAILED:', {
    paymentId,
    errorCode: payload.errorCode,
    errorMessage: payload.errorMessage,
  });
}

async function handlePaymentCancelled(
  paymentId: string,
  payload: z.infer<typeof WebhookPayloadSchema>
) {
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: 'FAILED',
      gatewayResponse: payload as unknown as Prisma.InputJsonValue,
      transactionId: payload.transactionId,
    },
  });

  console.log('[IDFC Webhook] Payment CANCELLED:', {
    paymentId,
    transactionId: payload.transactionId,
  });
}