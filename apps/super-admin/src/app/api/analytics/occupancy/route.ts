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

    // ─── Role Check ──────────────────────────────────────────────────────────
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") ?? "12", 10);
    const propertyId = searchParams.get("propertyId");

    // Build property filters
    const roomPropertyFilter = propertyId ? { propertyId } : {};
    const bookingPropertyFilter = propertyId ? { room: { propertyId } } : {};

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const bookings = await db.booking.findMany({
      where: {
        ...bookingPropertyFilter,
        checkIn: { gte: startDate },
        status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
      },
      select: {
        checkIn: true,
        checkOut: true,
        room: { select: { type: true, propertyId: true } },
      },
    });

    const totalRooms = await db.room.count({ where: roomPropertyFilter });
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
    const currentOccupied = await db.room.count({
      where: { ...roomPropertyFilter, status: "OCCUPIED" }
    });
    const currentOccupancy =
      totalRooms > 0 ? (currentOccupied / totalRooms) * 100 : 0;

    // ─── Property breakdown when showing "all" ───────────────────────────────
    let propertyBreakdown = null;
    if (!propertyId) {
      const properties = await db.property.findMany({
        select: { id: true, name: true, code: true },
      });

      propertyBreakdown = await Promise.all(
        properties.map(async (property) => {
          const [rooms, occupied] = await Promise.all([
            db.room.count({ where: { propertyId: property.id } }),
            db.room.count({ where: { propertyId: property.id, status: "OCCUPIED" } }),
          ]);
          return {
            propertyId: property.id,
            propertyName: property.name,
            propertyCode: property.code,
            totalRooms: rooms,
            occupiedRooms: occupied,
            currentOccupancy: rooms > 0 ? Math.round((occupied / rooms) * 100 * 10) / 10 : 0,
          };
        })
      );
    }

    return NextResponse.json({
      data: {
        monthlyOccupancy: monthsArr,
        currentOccupancy: Math.round(currentOccupancy * 10) / 10,
        occupiedRooms: currentOccupied,
        totalRooms,
        availableRooms: totalRooms - currentOccupied,
      },
      propertyBreakdown,
      selectedPropertyId: propertyId,
    });
  } catch (error) {
    console.error("[OCCUPANCY_ANALYTICS]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
