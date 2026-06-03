import { NextRequest } from 'next/server';
import { db, updatePaymentStatus, generateInvoice, createPayment, Prisma } from '@the-rooms/db';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { sendBookingConfirmation, sendPaymentSuccess } from '@the-rooms/email/send';
import { z } from 'zod';

const SimulateSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = SimulateSchema.parse(body);

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, room: true },
    });

    if (!booking) {
      return badRequest('Booking not found');
    }

    // Check if there is an existing pending payment, or create a mock one
    let payment = await db.payment.findFirst({
      where: { bookingId, status: 'PENDING' },
    });

    if (!payment) {
      payment = await createPayment({
        bookingId,
        amount: booking.totalAmount,
        method: 'ONLINE',
        transactionId: `SIM-${Date.now()}`,
        status: 'PENDING',
      });
    }

    // Mark payment as PAID
    await updatePaymentStatus(
      payment.id,
      'PAID',
      `SIM-GATEWAY-${Date.now()}`,
      { simulated: true }
    );

    // Update booking to CONFIRMED and PAID
    await db.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
      },
    });

    // Generate invoice
    await generateInvoice(payment.id, booking.id);

    // Send emails
    const guestEmail = booking.guest?.email;
    if (guestEmail) {
      try {
        await Promise.all([
          sendBookingConfirmation(guestEmail, booking.id),
          sendPaymentSuccess(guestEmail, booking.id)
        ]);
      } catch (e) {
        console.error('[Simulate] Email error:', e);
      }
    }

    return ok({ message: 'Simulated payment success' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Simulate] Error:', error);
    return serverError();
  }
}
