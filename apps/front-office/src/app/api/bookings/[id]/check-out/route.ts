import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getBookingById, updateBookingStatus, Prisma, generateInvoice } from "@the-rooms/db";
import prisma from "@the-rooms/db";
import { sendInvoice } from "@the-rooms/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "CHECKED_OUT") {
      return NextResponse.json({ error: "Already checked out" }, { status: 400 });
    }

    const body = await request.json();
    const { finalPayment, paymentMethod, transactionId, notes, sendInvoice: shouldSendInvoice } = body;

    let paymentIdForInvoice: string | undefined;

    // Wrap entire state mutation in a transaction
    await prisma.$transaction(async (tx) => {
      // Handle payments and refunds
      if (finalPayment && finalPayment !== 0) {
        const isRefund = finalPayment < 0;
        const amount = new Prisma.Decimal(Math.abs(finalPayment));
        
        const newPayment = await tx.payment.create({
          data: {
            bookingId: id,
            amount,
            method: paymentMethod ?? "CASH",
            transactionId,
            status: isRefund ? "REFUNDED" : "PAID",
            refundAmount: isRefund ? amount : null,
            refundStatus: isRefund ? "COMPLETED" : null,
            refundReason: isRefund ? "Overpayment at Check-out" : null,
          },
        });
        paymentIdForInvoice = newPayment.id;

        await tx.booking.update({
          where: { id },
          data: { paymentStatus: isRefund ? "REFUNDED" : "PAID" },
        });
      }

      // Update booking and sync room to VACANT inside transaction
      await updateBookingStatus(id, "CHECKED_OUT", tx);

      // Automatically mark the room as dirty for housekeeping
      await tx.room.update({
        where: { id: booking.roomId },
        data: { cleaningStatus: "DIRTY" }
      });

      await tx.auditLog.create({
        data: {
          userId: (session.user as { id?: string }).id,
          bookingId: id,
          action: "CHECK_OUT",
          entity: "booking",
          entityId: id,
          metadata: { checkOutTime: new Date(), finalPayment, paymentMethod, notes },
        },
      });
    });

    const updatedBooking = await getBookingById(id);

    // Invoice Generation and Emailing
    if (shouldSendInvoice) {
      // Find latest payment to associate invoice if no new payment was created
      if (!paymentIdForInvoice) {
        const latestPayment = await prisma.payment.findFirst({
          where: { bookingId: id },
          orderBy: { createdAt: 'desc' }
        });
        paymentIdForInvoice = latestPayment?.id;
      }

      if (paymentIdForInvoice) {
        const invoiceData = await generateInvoice(paymentIdForInvoice, id);
        
        if (booking.guest.email) {
          try {
            await sendInvoice(booking.guest.email, {
              guestName: booking.guest.name,
              guestEmail: booking.guest.email,
              invoiceNumber: invoiceData.invoiceNumber,
              invoiceDate: invoiceData.createdAt.toISOString(),
              bookingNumber: booking.bookingNumber,
              roomType: booking.room.type,
              roomNumber: booking.room.roomNumber,
              checkIn: booking.checkIn.toISOString(),
              checkOut: new Date().toISOString(),
              guestsCount: booking.guestsCount,
              baseAmount: Number(booking.baseAmount),
              discountAmount: Number(booking.discountAmount),
              totalAmount: Number(booking.totalAmount),
              paymentMethod: paymentMethod ?? 'Online',
              transactionId: transactionId,
              pdfUrl: invoiceData.pdfUrl ?? undefined,
            });
            console.log("Invoice email sent to", booking.guest.email);
          } catch (e) {
            console.error("Failed to send invoice email:", e);
          }
        }
      }
    }

    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (error) {
    console.error("Error checking out:", error);
    return NextResponse.json({ error: "Failed to check out" }, { status: 500 });
  }
}
