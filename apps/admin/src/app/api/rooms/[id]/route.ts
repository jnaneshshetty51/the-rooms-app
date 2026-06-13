// apps/admin/src/app/api/rooms/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";

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
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        amenities: { include: { amenity: true } },
        bookings: {
          where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
          include: { guest: { select: { name: true, phone: true } } },
          orderBy: { checkIn: "asc" },
        },
      },
    });

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[ROOM_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    const body = await request.json();

    const { status, roomNumber, type, floor, description, maxOccupancy, basePriceSingle, basePriceDouble, monthlyPriceSingle, monthlyPriceDouble, internalNotes } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (type !== undefined) updateData.type = type;
    if (floor !== undefined) updateData.floor = floor;
    if (description !== undefined) updateData.description = description;
    if (maxOccupancy !== undefined) updateData.maxOccupancy = maxOccupancy;
    if (basePriceSingle !== undefined) updateData.basePriceSingle = new Prisma.Decimal(basePriceSingle);
    if (basePriceDouble !== undefined) updateData.basePriceDouble = new Prisma.Decimal(basePriceDouble);
    if (monthlyPriceSingle !== undefined) updateData.monthlyPriceSingle = monthlyPriceSingle ? new Prisma.Decimal(monthlyPriceSingle) : null;
    if (monthlyPriceDouble !== undefined) updateData.monthlyPriceDouble = monthlyPriceDouble ? new Prisma.Decimal(monthlyPriceDouble) : null;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
      include: { amenities: { include: { amenity: true } } },
    });

    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[ROOM_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { id } = await params;

    // Check for active bookings
    const activeBooking = await prisma.booking.findFirst({
      where: { roomId: id, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    });

    if (activeBooking) {
      return NextResponse.json(
        { error: "Cannot delete room with active bookings" },
        { status: 409 }
      );
    }

    await prisma.room.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[ROOM_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
