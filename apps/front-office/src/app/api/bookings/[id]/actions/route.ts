import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { actionType, amount, reason, notes } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (actionType === "CHARGE") {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Valid amount is required for charges" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // Update booking amounts
        await tx.booking.update({
          where: { id },
          data: {
            extrasAmount: { increment: amount },
            totalAmount: { increment: amount },
          },
        });

        // Log the charge
        await tx.auditLog.create({
          data: {
            userId: (session.user as { id?: string }).id,
            bookingId: id,
            action: "CHARGE_ADDED",
            entity: "booking",
            entityId: id,
            metadata: {
              amount,
              reason: reason || "Incidental Charge",
              addedAt: new Date().toISOString(),
            },
          },
        });
      });
    } else if (actionType === "NOTE" || actionType === "REQUEST") {
      if (!notes) {
        return NextResponse.json({ error: "Notes are required" }, { status: 400 });
      }

      await prisma.auditLog.create({
        data: {
          userId: (session.user as { id?: string }).id,
          bookingId: id,
          action: actionType === "NOTE" ? "BOOKING_NOTE" : "GUEST_REQUEST",
          entity: "booking",
          entityId: id,
          metadata: {
            notes,
            addedAt: new Date().toISOString(),
          },
        },
      });
    } else {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing booking action:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
