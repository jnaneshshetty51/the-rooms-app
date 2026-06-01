// apps/web/src/app/api/bookings/[id]/check-out/route.ts
// POST /api/bookings/:id/check-out

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, unauthorized, forbidden } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { sendInvoice } from '@the-rooms/email';
import { generateInvoice } from '@the-rooms/db/queries/invoice';

import { db } from '@the-rooms/db';
type RouteParams = { params: Promise<{ id: string }> };

const CheckOutSchema = z.object({
  extraCharges: z.array(z.object({
    description: z.string(),
    amount: z.number().positive(),
  })).optional(),
  notes: z.string().optional(),
});

// POST /api/bookings/:id/check-out
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const data = CheckOutSchema.parse(body);


    // Get booking
    const booking = await db.booking.findUnique({
      where: { id },
      include: { guest: true, room: true, payments: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'CHECKED_OUT') {
      return badRequest('Guest is already checked out');
    }

    if (booking.status !== 'CHECKED_IN') {
      return badRequest('Guest must be checked in before checking out');
    }

    // Calculate extra charges if any
    let extraAmount = 0;
    if (data.extraCharges && data.extraCharges.length > 0) {
      extraAmount = data.extraCharges.reduce((sum, charge) => sum + charge.amount, 0);

      // Add extra charges to booking
      await db.booking.update({
        where: { id },
        data: {
          extrasAmount: booking.extrasAmount.plus(extraAmount),
          totalAmount: booking.totalAmount.plus(extraAmount),
        },
      });
    }

    // Get updated booking
    const updatedBooking = await db.booking.findUnique({
      where: { id },
      include: { guest: true, room: true, payments: true },
    });

    // Update booking status
    await db.booking.update({
      where: { id },
      data: {
        status: 'CHECKED_OUT',
        checkOutTime: new Date(),
        specialRequests: data.notes
          ? `${booking.specialRequests ?? ''}\n\nCheckout notes: ${data.notes}`
          : booking.specialRequests,
      },
    });

    // Update room status
    await db.room.update({
      where: { id: booking.roomId },
      data: { status: 'VACANT' },
    });

    // Check if payment is complete, if not create payment record for extras
    const totalPaid = booking.payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const finalTotal = Number(updatedBooking!.totalAmount);
    const outstanding = finalTotal - totalPaid;

    // If there's outstanding, create a payment record
    if (outstanding > 0) {
      await db.payment.create({
        data: {
          bookingId: id,
          amount: outstanding,
          method: 'CASH',
          status: 'PAID',
          transactionId: `CO-${id.slice(-8)}`,
        },
      });
    }

    // Generate invoice
    const payment = await db.payment.findFirst({
      where: { bookingId: id, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
    });

    if (payment) {
      const invoice = await generateInvoice(payment.id, id);

      // Send invoice email
      if (booking.guest.email) {
        await sendInvoice(booking.guest.email, {
          guestName: booking.guest.name ?? 'Guest',
          guestEmail: booking.guest.email,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.createdAt.toISOString(),
          bookingNumber: booking.bookingNumber,
          roomType: booking.room?.type ?? 'STUDIO',
          roomNumber: booking.room?.roomNumber ?? 'N/A',
          checkIn: booking.checkIn.toISOString(),
          checkOut: booking.checkOut.toISOString(),
          guestsCount: booking.guestsCount,
          baseAmount: Number(booking.baseAmount),
          discountAmount: Number(booking.discountAmount ?? 0),
          cgst: Number(booking.totalAmount) * 0.09,
          sgst: Number(booking.totalAmount) * 0.09,
          totalAmount: Number(booking.totalAmount),
          pdfUrl: invoice.pdfUrl ?? undefined,
        }).catch(
          (e) => console.error('[Check-out] Invoice email error:', e)
        );
      }
    }

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'CHECK_OUT',
      entity: 'booking',
      entityId: id,
      metadata: {
        bookingNumber: booking.bookingNumber,
        roomId: booking.roomId,
        roomNumber: booking.room.roomNumber,
        guestName: booking.guest.name,
        extraCharges: data.extraCharges,
        finalAmount: finalTotal,
      },
      ipAddress: getClientIp(request),
    });

    return ok({
      booking: await db.booking.findUnique({
        where: { id },
        include: { guest: true, room: true },
      }),
      roomId: booking.roomId,
      extraChargesApplied: extraAmount,
      finalAmount: finalTotal,
      invoiceNumber: payment ? (await db.invoice.findUnique({ where: { bookingId: id } }))?.invoiceNumber : null,
      message: 'Check-out completed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Check-out] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
