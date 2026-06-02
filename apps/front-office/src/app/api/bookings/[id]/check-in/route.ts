import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getBookingById, updateBookingStatus } from "@the-rooms/db";
import { incrementStayCount } from "@the-rooms/db";
import prisma from "@the-rooms/db";

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

    if (booking.status === "CHECKED_IN") {
      return NextResponse.json({ error: "Already checked in" }, { status: 400 });
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Booking must be confirmed" }, { status: 400 });
    }

    const updatedBooking = await updateBookingStatus(id, "CHECKED_IN");
    await incrementStayCount(booking.guestId);

    await prisma.auditLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        bookingId: id,
        action: "CHECK_IN",
        entity: "booking",
        entityId: id,
        metadata: { checkInTime: new Date() },
      },
    });

    return NextResponse.json({ success: true, booking: updatedBooking });

  } catch (error) {
    console.error("Error checking in:", error);
    return NextResponse.json({ error: "Failed to check in" }, { status: 500 });
  }
}
