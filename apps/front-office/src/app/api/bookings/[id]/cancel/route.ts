import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getBookingById, updateBookingStatus, db } from "@the-rooms/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const bookingId = resolvedParams.id;

    // Get the booking
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify state is CONFIRMED
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Only confirmed bookings can be cancelled" }, { status: 400 });
    }

    // Cancel the booking and release the room in a transaction
    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" }
      });

      // Release the room back to VACANT
      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: "VACANT" }
      });

      // Update any PENDING payments to FAILED
      await tx.payment.updateMany({
        where: { bookingId, status: "PENDING" },
        data: { status: "FAILED" }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
