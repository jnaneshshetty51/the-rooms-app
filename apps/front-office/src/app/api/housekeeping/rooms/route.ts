import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "HOUSEKEEPING" && role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "FRONT_OFFICE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rooms = await prisma.room.findMany({
      select: {
        id: true,
        roomNumber: true,
        floor: true,
        status: true,
        cleaningStatus: true,
        type: true,
      },
      orderBy: [
        { floor: 'asc' },
        { roomNumber: 'asc' }
      ]
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Error fetching housekeeping rooms:", error);
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}
