// apps/web/src/app/api/payments/indusind/webhook/route.ts
// POST /api/payments/indusind/webhook — INDUSIND payment webhook receiver

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getINDUSINDClient, WebhookPayload, INDUSINDError } from '@the-rooms/payments/indusind';
import { updatePaymentStatus } from '@the-rooms/db';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { Prisma } from '@prisma/client';
import { sendBookingConfirmation, sendPaymentSuccess } from '@the-rooms/email';
import { generateInvoice } from '@the-rooms/db';

import { db } from '@the-rooms/db';
const WebhookSchema = z.object({
  orderId: z.string(),
  transactionId: z.string(),
  status: z.enum(['SUCCESS', 'FAILED', 'CANCELLED']),
  amount: z.number(),
  currency: z.string().optional(),
  paymentMethod: z.string().optional(),
  gatewayTransactionId: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  checksum: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody) as WebhookPayload;

    // Validate webhook schema
    const parseResult = WebhookSchema.safeParse(payload);
    if (!parseResult.success) {
      console.error('[INDUSIND Webhook] Invalid payload:', parseResult.error);
      return badRequest('Invalid webhook payload');
    }

    // Verify checksum
    const indusind = getINDUSINDClient();
    const webhookSecret = process.env.INDUSIND_WEBHOOK_SECRET ?? '';

    // Generate expected checksum
    const { checksum, ...payloadWithoutChecksum } = payload;
    const expectedChecksum = indusind.generateChecksum(payloadWithoutChecksum);

    if (checksum !== expectedChecksum) {
      console.error('[INDUSIND Webhook] Checksum mismatch');
      return NextResponse.json(
        { error: 'Invalid checksum' },
        { status: 403 }
      );
    }

    console.log('[INDUSIND Webhook] Processing:', payload.orderId, payload.status);

    // Find payment by order ID
    const payment = await db.payment.findFirst({
      where: {
        transactionId: payload.orderId,
      },
      include: {
        booking: {
          include: {
            guest: true,
            room: true,
          },
        },
      },
    });

    if (!payment) {
      console.error('[INDUSIND Webhook] Payment not found for order:', payload.orderId);
      // Return 200 to INDUSIND to prevent retries for unknown orders
      return ok({ message: 'Payment not found' });
    }

    // Idempotency check — skip if already processed
    if (payment.status === 'PAID' && payload.status === 'SUCCESS') {
      console.log('[INDUSIND Webhook] Already processed, skipping:', payload.orderId);
      return ok({ message: 'Already processed' });
    }

    const { booking } = payment;

    // Process based on payment status
    switch (payload.status) {
      case 'SUCCESS': {
        // Update payment to PAID
        await updatePaymentStatus(
          payment.id,
          'PAID',
          payload.gatewayTransactionId ?? payload.transactionId,
          payload as unknown as Prisma.JsonObject
        );

        // Update booking payment status
        await db.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
          },
        });

        // Generate invoice
        const invoice = await generateInvoice(payment.id, booking.id);

        // Send confirmation emails
        const guestEmail = booking.guest?.email;
        if (guestEmail) {
          await Promise.all([
            sendBookingConfirmation({
              to: guestEmail,
              guestName: booking.guest?.name ?? 'Guest',
              bookingId: booking.id,
              bookingNumber: booking.bookingNumber,
              roomNumber: booking.room?.roomNumber ?? 'TBD',
              roomType: booking.room?.type ?? 'STUDIO',
              checkIn: booking.checkIn.toISOString(),
              checkOut: booking.checkOut.toISOString(),
              guestsCount: booking.guestsCount,
              totalAmount: Number(payment.amount ?? 0),
              paymentMethod: payload.paymentMethod ?? 'Online',
              hotelAddress: process.env.HOTEL_ADDRESS ?? 'The Rooms, MG Road, Bangalore',
              hotelPhone: process.env.HOTEL_PHONE ?? '+91 80 4567 8900',
              hotelEmail: process.env.EMAIL_FROM ?? 'hello@therooms.in',
            }).catch((e) => console.error('[Webhook] Email error:', e)),
            sendPaymentSuccess({
              to: guestEmail,
              guestName: booking.guest?.name ?? 'Guest',
              bookingNumber: booking.bookingNumber,
              roomType: booking.room?.type ?? 'STUDIO',
              roomNumber: booking.room?.roomNumber ?? 'TBD',
              amount: Number(payment.amount ?? 0),
              transactionId: payload.gatewayTransactionId ?? payload.transactionId,
              paymentMethod: payload.paymentMethod ?? 'Online',
              checkIn: booking.checkIn.toISOString(),
              checkOut: booking.checkOut.toISOString(),
            }).catch((e) => console.error('[Webhook] Payment email error:', e)),
          ]);
        }

        // Audit log
        await createAuditLog({
          action: 'PAYMENT_RECEIVED',
          entity: 'payment',
          entityId: payment.id,
          metadata: {
            bookingId: booking.id,
            amount: payload.amount,
            gatewayTransactionId: payload.gatewayTransactionId,
            paymentMethod: payload.paymentMethod,
          },
          ipAddress: 'indusind-webhook',
        });

        console.log('[INDUSIND Webhook] Payment success:', payload.orderId);
        break;
      }

      case 'FAILED':
      case 'CANCELLED': {
        await updatePaymentStatus(
          payment.id,
          'FAILED',
          payload.gatewayTransactionId ?? payload.transactionId,
          {
            ...payload,
            failureReason: payload.errorMessage ?? 'Payment failed or cancelled',
          } as Prisma.JsonObject
        );

        await db.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: 'FAILED',
          },
        });

        await createAuditLog({
          action: payload.status === 'CANCELLED' ? 'PAYMENT_CANCELLED' : 'PAYMENT_FAILED',
          entity: 'payment',
          entityId: payment.id,
          metadata: {
            bookingId: booking.id,
            errorCode: payload.errorCode,
            errorMessage: payload.errorMessage,
          },
          ipAddress: 'indusind-webhook',
        });

        console.log('[INDUSIND Webhook] Payment failed/cancelled:', payload.orderId);
        break;
      }
    }

    return ok({ message: 'Webhook processed' });
  } catch (error) {
    console.error('[INDUSIND Webhook] Error:', error);

    if (error instanceof INDUSINDError) {
      return badRequest(error.message, 'GATEWAY_ERROR');
    }

    // Return 200 to prevent INDUSIND from retrying
    // Log error internally
    await createAuditLog({
      action: 'WEBHOOK_ERROR',
      entity: 'payment',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: getClientIp(request),
      },
    });

    return ok({ message: 'Error logged' }); // Return 200 to stop retries
  }
}
