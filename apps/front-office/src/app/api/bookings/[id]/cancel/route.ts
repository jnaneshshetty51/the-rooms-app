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

    // Cancel the booking
    await updateBookingStatus(bookingId, "CANCELLED");

    // Also update any PENDING payments to FAILED
    await db.payment.updateMany({
      where: { bookingId, status: "PENDING" },
      data: { status: "FAILED" }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
