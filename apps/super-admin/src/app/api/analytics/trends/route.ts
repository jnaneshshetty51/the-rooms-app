// apps/super-admin/src/app/api/analytics/trends/route.ts
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
      where: { createdAt: { gte: startDate } },
      select: {
        createdAt: true,
        bookingType: true,
        totalAmount: true,
        status: true,
      },
    });

    const monthsArr: {
      month: string;
      daily: number;
      monthly: number;
      total: number;
      revenue: number;
    }[] = [];

    for (let i = 0; i < months; i++) {
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      const monthLabel = monthDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      const monthBookings = bookings.filter((b) => {
        const created = new Date(b.createdAt);
        return created >= monthDate && created < nextMonth;
      });

      const daily = monthBookings.filter((b) => b.bookingType === "DAILY").length;
      const monthly = monthBookings.filter((b) => b.bookingType === "MONTHLY").length;
      const revenue = monthBookings.reduce(
        (sum, b) => sum + Number(b.totalAmount),
        0
      );

      monthsArr.push({ month: monthLabel, daily, monthly, total: daily + monthly, revenue });
    }

    // ADR data with live calculations
    const adrData: { month: string; adr: number; revpar: number; occupancyRate: number }[] = [];
    const totalRooms = await db.room.count();

    // Fetch all bookings with checkIn/checkOut for occupancy calculation
    const allBookingsWithDates = await db.booking.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
      },
      select: {
        createdAt: true,
        checkIn: true,
        checkOut: true,
        totalAmount: true,
        status: true,
      },
    });

    for (let i = 0; i < months; i++) {
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      const daysInMonth = nextMonth.getDate();
      const monthLabel = monthDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      // Filter bookings created in this month
      const monthBookings = bookings.filter((b) => {
        const created = new Date(b.createdAt);
        return created >= monthDate && created < nextMonth && b.status === "CHECKED_IN";
      });

      const totalRevenue = monthBookings.reduce(
        (sum, b) => sum + Number(b.totalAmount),
        0
      );

      // Calculate occupied room-days for this month
      let occupiedRoomDays = 0;
      for (const booking of allBookingsWithDates) {
        // Only count bookings that overlap with this month
        const bStart = booking.checkIn < monthDate ? monthDate : booking.checkIn;
        const bEnd = booking.checkOut > nextMonth ? nextMonth : booking.checkOut;
        if (bStart <= bEnd) {
          const nights = Math.ceil(
            (bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24)
          );
          occupiedRoomDays += nights;
        }
      }

      const totalAvailableRoomDays = totalRooms * daysInMonth;
      const occupancyRate = totalAvailableRoomDays > 0 ? (occupiedRoomDays / totalAvailableRoomDays) * 100 : 0;

      // ADR = Total Revenue / Rooms Sold (occupied nights)
      const adr = occupiedRoomDays > 0 ? totalRevenue / occupiedRoomDays : 0;

      // RevPAR = Total Revenue / Total Available Room-Days (not ADR × occupancy)
      const revpar = totalAvailableRoomDays > 0 ? totalRevenue / totalAvailableRoomDays : 0;

      adrData.push({
        month: monthLabel,
        adr: Math.round(adr),
        revpar: Math.round(revpar),
        occupancyRate: Math.round(occupancyRate * 10) / 10,
      });
    }

    return NextResponse.json({
      data: {
        bookingTrends: monthsArr,
        adrData,
      },
    });
  } catch (error) {
    console.error("[TRENDS_ANALYTICS]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
