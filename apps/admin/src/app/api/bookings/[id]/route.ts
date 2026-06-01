// apps/admin/src/app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        room: { include: { photos: true, amenities: { include: { amenity: true } } } },
        payments: true,
        invoice: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    return NextResponse.json({ booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[BOOKING_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const VALID_STATUSES = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "CHECKED_IN") updateData.checkInTime = new Date();
    if (status === "CHECKED_OUT") updateData.checkOutTime = new Date();

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
    });

    // Auto-update room status
    if (status === "CHECKED_IN") {
      await prisma.room.update({ where: { id: booking.roomId }, data: { status: "OCCUPIED" } });
    } else if (status === "CHECKED_OUT" || status === "CANCELLED") {
      await prisma.room.update({ where: { id: booking.roomId }, data: { status: "VACANT" } });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[BOOKING_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
