// apps/guest-portal/src/app/api/extend-stay/route.ts
// POST /api/extend-stay — request stay extension
import { auth } from "@the-rooms/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma, getBookingById, createExtendStayRequest } from "@the-rooms/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, newCheckOut, reason } = body;

    if (!bookingId || !newCheckOut) {
      return NextResponse.json(
        { error: "bookingId and newCheckOut are required" },
        { status: 400 }
      );
    }

    // Verify booking belongs to this guest
    const guest = await prisma.guest.findFirst({
      where: { email: session.user.email ?? "" },
    });
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const booking = await getBookingById(bookingId);
    if (!booking || booking.guestId !== guest.id) {
      return NextResponse.json(
        { error: "Booking not found or unauthorized" },
        { status: 403 }
      );
    }

    // Only allow extension for upcoming or checked-in bookings
    if (!["CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Cannot extend this booking in its current status" },
        { status: 400 }
      );
    }

    const newCheckOutDate = new Date(newCheckOut);
    if (newCheckOutDate <= booking.checkOut) {
      return NextResponse.json(
        { error: "New check-out date must be after current check-out" },
        { status: 400 }
      );
    }

    const result = await createExtendStayRequest({
      bookingId,
      newCheckOut: newCheckOutDate,
      reason,
    });

    // Notify front office via audit log (FO would poll or get webhook)
    await prisma.auditLog.create({
      data: {
        userId: guest.id,
        bookingId,
        action: "EXTEND_REQUEST",
        entity: "booking",
        entityId: bookingId,
        metadata: {
          newCheckOut: newCheckOutDate.toISOString(),
          reason: reason ?? "",
          notificationSent: true,
        },
      },
    });

    return NextResponse.json({
      message: "Extension request submitted successfully",
      booking: result.booking,
    }, { status: 201 });
  } catch (error) {
    console.error("Error requesting extension:", error);
    return NextResponse.json(
      { error: "Failed to submit extension request" },
      { status: 500 }
    );
  }
}
