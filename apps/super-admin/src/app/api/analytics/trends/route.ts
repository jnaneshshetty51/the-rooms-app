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

    // ADR data
    const adrData: { month: string; adr: number; revpar: number }[] = [];
    const totalRooms = await db.room.count();

    for (let i = 0; i < months; i++) {
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      const monthLabel = monthDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      const monthBookings = bookings.filter((b) => {
        const created = new Date(b.createdAt);
        return created >= monthDate && created < nextMonth && b.status === "CHECKED_IN";
      });

      const totalRevenue = monthBookings.reduce(
        (sum, b) => sum + Number(b.totalAmount),
        0
      );
      const adr =
        monthBookings.length > 0 ? totalRevenue / monthBookings.length : 0;

      // RevPAR = ADR × occupancy (simplified)
      const revpar = adr * 0.78;

      adrData.push({
        month: monthLabel,
        adr: Math.round(adr),
        revpar: Math.round(revpar),
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
