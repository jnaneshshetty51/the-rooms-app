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
    const { newRoomId } = body;

    if (!newRoomId) {
      return NextResponse.json({ error: "Missing newRoomId" }, { status: 400 });
    }

    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_IN") {
      return NextResponse.json({ error: "Can only reassign active bookings" }, { status: 400 });
    }

    const newRoom = await db.room.findUnique({ where: { id: newRoomId } });
    if (!newRoom || newRoom.status !== "VACANT") {
      return NextResponse.json({ error: "Selected room is not vacant" }, { status: 400 });
    }

    // Recalculate price
    const pricing = await calculatePrice(
      newRoomId,
      booking.checkIn,
      booking.checkOut,
      booking.guestsCount,
      booking.bookingType as "DAILY" | "MONTHLY"
    );

    // Update the booking in a transaction to handle room statuses safely
    await db.$transaction(async (tx) => {
      // Free old room if checked in (or if the status was managed)
      if (booking.status === "CHECKED_IN") {
        await tx.room.update({
          where: { id: booking.roomId },
          data: { status: "VACANT" }
        });
        // Occupy new room
        await tx.room.update({
          where: { id: newRoomId },
          data: { status: "OCCUPIED" }
        });
      }

      await tx.booking.update({
        where: { id },
        data: {
          roomId: newRoomId,
          baseAmount: pricing.baseAmount,
          totalAmount: pricing.totalAmount
        }
      });

      await tx.auditLog.create({
        data: {
          userId: (session.user as { id?: string }).id,
          bookingId: id,
          action: "UPDATE",
          entity: "booking",
          entityId: id,
          metadata: { 
            event: "ROOM_REASSIGN",
            oldRoomId: booking.roomId, 
            newRoomId,
            priceAdjustment: Number(pricing.totalAmount) - Number(booking.totalAmount)
          },
        },
      });
    });

    return NextResponse.json({ success: true, pricing });
  } catch (error) {
    console.error("Failed to reassign room:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
