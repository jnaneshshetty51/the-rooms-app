import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getBookingById, updateBookingStatus } from "@the-rooms/queries/bookingQueries";
import prisma from "@the-rooms/db";
import { Prisma } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const booking = await getBookingById(params.id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "CHECKED_OUT") {
      return NextResponse.json({ error: "Already checked out" }, { status: 400 });
    }

    const body = await request.json();
    const { finalPayment, paymentMethod, transactionId, notes } = body;

    if (finalPayment && finalPayment > 0) {
      await prisma.payment.create({
        data: {
          bookingId: params.id,
          amount: new Prisma.Decimal(finalPayment),
          method: paymentMethod ?? "CASH",
          transactionId,
          status: "PAID",
        },
      });

      await prisma.booking.update({
        where: { id: params.id },
        data: { paymentStatus: "PAID" },
      });
    }

    const updatedBooking = await updateBookingStatus(params.id, "CHECKED_OUT");

    await prisma.auditLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        bookingId: params.id,
        action: "CHECK_OUT",
        entity: "booking",
        entityId: params.id,
        metadata: { checkOutTime: new Date(), finalPayment, paymentMethod, notes },
      },
    });

    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (error) {
    console.error("Error checking out:", error);
    return NextResponse.json({ error: "Failed to check out" }, { status: 500 });
  }
}
