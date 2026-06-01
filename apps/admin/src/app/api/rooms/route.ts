// apps/admin/src/app/api/rooms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const where: Prisma.RoomWhereInput = {};
    if (type) where.type = type as "STUDIO" | "PREMIUM";
    if (status) where.status = status as "VACANT" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED";

    const rooms = await prisma.room.findMany({
      where,
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        amenities: { include: { amenity: true } },
      },
      orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    });

    return NextResponse.json({ rooms });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[ROOMS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const body = await request.json();
    const { roomNumber, type, floor, description, maxOccupancy, sizeSqft, basePriceSingle, basePriceDouble, monthlyPriceSingle, monthlyPriceDouble, internalNotes } = body;

    const existing = await prisma.room.findUnique({ where: { roomNumber } });
    if (existing) {
      return NextResponse.json({ error: "Room number already exists" }, { status: 409 });
    }

    const room = await prisma.room.create({
      data: {
        roomNumber,
        type: type ?? "STUDIO",
        floor: floor ?? 1,
        description,
        maxOccupancy: maxOccupancy ?? 2,
        sizeSqft,
        basePriceSingle: new Prisma.Decimal(basePriceSingle ?? 999),
        basePriceDouble: new Prisma.Decimal(basePriceDouble ?? 1799),
        monthlyPriceSingle: monthlyPriceSingle ? new Prisma.Decimal(monthlyPriceSingle) : undefined,
        monthlyPriceDouble: monthlyPriceDouble ? new Prisma.Decimal(monthlyPriceDouble) : undefined,
        internalNotes,
      },
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        amenities: { include: { amenity: true } },
      },
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[ROOMS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const body = await request.json();
    const { id, roomNumber, type, floor, description, maxOccupancy, sizeSqft, basePriceSingle, basePriceDouble, monthlyPriceSingle, monthlyPriceDouble, internalNotes, status } = body;

    if (!id) return NextResponse.json({ error: "Room ID required" }, { status: 400 });

    const updateData: Prisma.RoomUpdateInput = {};
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (type !== undefined) updateData.type = type;
    if (floor !== undefined) updateData.floor = floor;
    if (description !== undefined) updateData.description = description;
    if (maxOccupancy !== undefined) updateData.maxOccupancy = maxOccupancy;
    if (sizeSqft !== undefined) updateData.sizeSqft = sizeSqft;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (status !== undefined) updateData.status = status;
    if (basePriceSingle !== undefined) updateData.basePriceSingle = new Prisma.Decimal(basePriceSingle);
    if (basePriceDouble !== undefined) updateData.basePriceDouble = new Prisma.Decimal(basePriceDouble);
    if (monthlyPriceSingle !== undefined) updateData.monthlyPriceSingle = monthlyPriceSingle ? new Prisma.Decimal(monthlyPriceSingle) : null;
    if (monthlyPriceDouble !== undefined) updateData.monthlyPriceDouble = monthlyPriceDouble ? new Prisma.Decimal(monthlyPriceDouble) : null;

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        amenities: { include: { amenity: true } },
      },
    });

    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[ROOMS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
