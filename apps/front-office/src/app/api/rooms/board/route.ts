import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[ROOMS_BOARD] Fetching rooms...");
    const rooms = await prisma.room.findMany({
      include: {
        photos: { orderBy: { sortOrder: "asc" }, take: 1 },
        amenities: { include: { amenity: true } },
        bookings: {
          where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
          include: { guest: { select: { name: true } } },
          orderBy: { checkIn: "asc" },
          take: 1,
        },
      },
      orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    });
    console.log("[ROOMS_BOARD] Found", rooms.length, "rooms");

    const boardData = rooms.map((room) => {
      const activeBooking = room.bookings[0] ?? null;
      return {
        id: room.id,
        roomNumber: room.roomNumber,
        type: room.type,
        floor: room.floor,
        status: room.status,
        cleaningStatus: room.cleaningStatus,
        description: room.description,
        basePriceSingle: room.basePriceSingle,
        basePriceDouble: room.basePriceDouble,
        amenities: room.amenities.map((ra) => ra.amenity.name),
        currentBooking: activeBooking
          ? { id: activeBooking.id, guestName: activeBooking.guest?.name ?? "Unknown", checkIn: activeBooking.checkIn, checkOut: activeBooking.checkOut }
          : null,
      };
    });

    console.log("[ROOMS_BOARD] Returning", boardData.length, "rooms");
    return NextResponse.json({
      rooms: boardData,
      totalRooms: rooms.length,
      vacant: rooms.filter((r) => r.status === "VACANT").length,
      occupied: rooms.filter((r) => r.status === "OCCUPIED").length,
      maintenance: rooms.filter((r) => r.status === "MAINTENANCE").length,
      blocked: rooms.filter((r) => r.status === "BLOCKED").length,
    });
  } catch (error) {
    console.error("[ROOMS_BOARD] Error:", error);
    return NextResponse.json({ error: "Failed to fetch room board" }, { status: 500 });
  }
}
