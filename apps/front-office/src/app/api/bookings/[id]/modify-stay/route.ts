import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getBookingById, db, calculatePrice } from "@the-rooms/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newCheckOut, guestsCount } = body;

    if (!newCheckOut || !guestsCount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_IN") {
      return NextResponse.json({ error: "Can only modify active bookings" }, { status: 400 });
    }

    // Recalculate price
    const newCheckOutDate = new Date(newCheckOut);
    const checkInDate = new Date(booking.checkIn);

    if (newCheckOutDate <= checkInDate) {
      return NextResponse.json({ error: "Check-out must be after check-in" }, { status: 400 });
    }

    // For simplicity, we use the booking's original type (DAILY/MONTHLY)
    const pricing = await calculatePrice(
      booking.roomId,
      checkInDate,
      newCheckOutDate,
      guestsCount,
      booking.bookingType as "DAILY" | "MONTHLY"
    );

    // Update booking
    await db.booking.update({
      where: { id },
      data: {
        checkOut: newCheckOutDate,
        guestsCount,
        baseAmount: pricing.baseAmount,
        totalAmount: pricing.totalAmount,
      }
    });

    return NextResponse.json({ success: true, pricing });
  } catch (error) {
    console.error("Failed to modify stay:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
