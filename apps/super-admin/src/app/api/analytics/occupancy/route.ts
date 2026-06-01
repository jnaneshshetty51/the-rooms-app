// apps/super-admin/src/app/api/analytics/occupancy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") ?? "12", 10);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const bookings = await db.booking.findMany({
      where: {
        checkIn: { gte: startDate },
        status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
      },
      select: {
        checkIn: true,
        checkOut: true,
        room: { select: { type: true } },
      },
    });

    const totalRooms = await db.room.count();
    const monthsArr: { month: string; occupancy: number; rooms: number }[] = [];

    // Generate monthly occupancy data
    for (let i = 0; i < months; i++) {
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      const monthLabel = monthDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      // Count days in month with bookings
      const daysInMonth = nextMonth.getDate();
      let occupiedRoomDays = 0;

      for (const booking of bookings) {
        const bStart = booking.checkIn < monthDate ? monthDate : booking.checkIn;
        const bEnd = booking.checkOut > nextMonth ? nextMonth : booking.checkOut;
        if (bStart <= bEnd) {
          const days = Math.ceil(
            (bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24)
          );
          occupiedRoomDays += days;
        }
      }

      const occupancyRate =
        totalRooms * daysInMonth > 0
          ? (occupiedRoomDays / (totalRooms * daysInMonth)) * 100
          : 0;

      monthsArr.push({
        month: monthLabel,
        occupancy: Math.round(occupancyRate * 10) / 10,
        rooms: Math.round((totalRooms * occupancyRate) / 100),
      });
    }

    // Current stats
    const currentOccupied = await db.room.count({ where: { status: "OCCUPIED" } });
    const currentOccupancy =
      totalRooms > 0 ? (currentOccupied / totalRooms) * 100 : 0;

    return NextResponse.json({
      data: {
        monthlyOccupancy: monthsArr,
        currentOccupancy: Math.round(currentOccupancy * 10) / 10,
        occupiedRooms: currentOccupied,
        totalRooms,
        availableRooms: totalRooms - currentOccupied,
      },
    });
  } catch (error) {
    console.error("[OCCUPANCY_ANALYTICS]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
