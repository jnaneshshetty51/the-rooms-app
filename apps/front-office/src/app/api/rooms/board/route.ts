import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getAllRooms } from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rooms = await getAllRooms();

    const boardData = rooms.map((room) => ({
      id: room.id,
      roomNumber: room.roomNumber,
      type: room.type,
      floor: room.floor,
      status: room.status,
      description: room.description,
      amenities: room.amenities.map((ra) => ra.amenity.name),
      currentBooking: room.bookings?.find((b) => b.status === "CHECKED_IN" || b.status === "CONFIRMED")
        ? { id: room.bookings[0].id, guestName: room.bookings[0].guest?.name ?? "Unknown", checkIn: room.bookings[0].checkIn, checkOut: room.bookings[0].checkOut }
        : null,
    }));

    return NextResponse.json({
      rooms: boardData,
      totalRooms: rooms.length,
      vacant: rooms.filter((r) => r.status === "VACANT").length,
      occupied: rooms.filter((r) => r.status === "OCCUPIED").length,
      maintenance: rooms.filter((r) => r.status === "MAINTENANCE").length,
      blocked: rooms.filter((r) => r.status === "BLOCKED").length,
    });
  } catch (error) {
    console.error("Error fetching room board:", error);
    return NextResponse.json({ error: "Failed to fetch room board" }, { status: 500 });
  }
}
