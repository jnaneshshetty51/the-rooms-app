import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const prismaAny = prisma as unknown as Record<string, { findMany: (args: unknown) => Promise<unknown> }>;
    const [rooms, rawTypeProfiles] = await Promise.all([
      prisma.room.findMany({
        include: {
          amenities: { include: { amenity: true } },
          bookings: {
            where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
            include: { guest: { select: { name: true, phone: true } } },
            orderBy: { checkIn: "asc" },
            take: 1,
          },
        },
        orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
      }),
      prismaAny.roomTypeProfile.findMany({
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      }),
    ]);
    const typeProfiles = rawTypeProfiles as Array<{ type: string; images: { url: string }[] }>;

    const typeImageMap: Record<string, string> = {};
    for (const p of typeProfiles) {
      if (p.images[0]) typeImageMap[p.type] = p.images[0].url;
    }

    const boardData = rooms.map((room) => {
      const activeBooking = room.bookings[0] ?? null;
      const checkInDate = activeBooking ? new Date(activeBooking.checkIn) : null;
      const arrivingToday = !!(
        activeBooking &&
        activeBooking.status === "CONFIRMED" &&
        checkInDate &&
        checkInDate >= today &&
        checkInDate < tomorrow
      );
      // A CONFIRMED booking means the room is reserved — don't show it as VACANT
      const displayStatus =
        activeBooking?.status === "CONFIRMED"
          ? "BOOKED"
          : activeBooking?.status === "CHECKED_IN"
          ? "OCCUPIED"
          : room.status;
      return {
        id: room.id,
        roomNumber: room.roomNumber,
        type: room.type,
        floor: room.floor,
        status: displayStatus,
        cleaningStatus: room.cleaningStatus,
        description: room.description,
        basePriceSingle: room.basePriceSingle,
        basePriceDouble: room.basePriceDouble,
        monthlyPriceSingle: room.monthlyPriceSingle,
        monthlyPriceDouble: room.monthlyPriceDouble,
        thumbnail: typeImageMap[room.type] ?? null,
        amenities: room.amenities.map((ra) => ra.amenity.name),
        currentBooking: activeBooking
          ? {
              id: activeBooking.id,
              bookingNumber: (activeBooking as { bookingNumber?: string }).bookingNumber ?? null,
              guestName: activeBooking.guest?.name ?? "Unknown",
              guestPhone: activeBooking.guest?.phone ?? null,
              checkIn: activeBooking.checkIn,
              checkOut: activeBooking.checkOut,
              status: activeBooking.status,
              arrivingToday,
            }
          : null,
      };
    });

    return NextResponse.json({
      rooms: boardData,
      totalRooms: rooms.length,
      vacant: boardData.filter((r) => r.status === "VACANT").length,
      booked: boardData.filter((r) => r.status === "BOOKED").length,
      occupied: boardData.filter((r) => r.status === "OCCUPIED").length,
      maintenance: boardData.filter((r) => r.status === "MAINTENANCE" || r.status === "BLOCKED").length,
      arrivingToday: boardData.filter((r) => r.currentBooking?.arrivingToday).length,
    });
  } catch (error) {
    console.error("[ROOMS_BOARD] Error:", error);
    return NextResponse.json({ error: "Failed to fetch room board" }, { status: 500 });
  }
}
