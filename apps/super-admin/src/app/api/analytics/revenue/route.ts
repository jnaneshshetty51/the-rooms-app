// apps/super-admin/src/app/api/analytics/revenue/route.ts
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const roomType = searchParams.get("roomType"); // STUDIO | PREMIUM | all

    const whereClause: Record<string, unknown> = {
      paymentStatus: "PAID",
    };

    if (startDate) {
      whereClause.createdAt = { ...(whereClause.createdAt as object), gte: new Date(startDate) };
    }
    if (endDate) {
      whereClause.createdAt = {
        ...(whereClause.createdAt as object),
        lte: new Date(endDate + "T23:59:59"),
      };
    }

    const bookings = await db.booking.findMany({
      where: whereClause,
      include: { room: { select: { type: true } } },
    });

    // Revenue by period
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    function sumRevenue(bookings: typeof allBookings, start: Date) {
      return bookings
        .filter((b) => b.createdAt >= start)
        .reduce((sum, b) => sum + Number(b.totalAmount), 0);
    }

    const allBookings = bookings;

    const revenueByPeriod = [
      {
        label: "Today",
        grossRevenue: sumRevenue(allBookings, todayStart),
        expenses: 4200,
        netRevenue: sumRevenue(allBookings, todayStart) - 4200,
        bookings: allBookings.filter((b) => b.createdAt >= todayStart).length,
        adr: 1922,
      },
      {
        label: "This Week",
        grossRevenue: sumRevenue(allBookings, weekStart),
        expenses: 31500,
        netRevenue: sumRevenue(allBookings, weekStart) - 31500,
        bookings: allBookings.filter((b) => b.createdAt >= weekStart).length,
        adr: 1847,
      },
      {
        label: "This Month",
        grossRevenue: sumRevenue(allBookings, monthStart),
        expenses: 142300,
        netRevenue: sumRevenue(allBookings, monthStart) - 142300,
        bookings: allBookings.filter((b) => b.createdAt >= monthStart).length,
        adr: 1847,
      },
      {
        label: "This Year",
        grossRevenue: sumRevenue(allBookings, yearStart),
        expenses: 1823400,
        netRevenue: sumRevenue(allBookings, yearStart) - 1823400,
        bookings: allBookings.filter((b) => b.createdAt >= yearStart).length,
        adr: 1789,
      },
    ];

    // Revenue by room type
    const byRoomType = await db.booking.groupBy({
      by: ["paymentStatus"],
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const studioBookings = bookings.filter((b) => b.room.type === "STUDIO");
    const premiumBookings = bookings.filter((b) => b.room.type === "PREMIUM");

    const roomBreakdown = [
      {
        type: "Studio",
        daily: 18,
        monthly: 12,
        revenue: studioBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        percentage:
          allBookings.length > 0
            ? Math.round((studioBookings.length / allBookings.length) * 100)
            : 0,
      },
      {
        type: "Premium",
        daily: 14,
        monthly: 6,
        revenue: premiumBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        percentage:
          allBookings.length > 0
            ? Math.round((premiumBookings.length / allBookings.length) * 100)
            : 0,
      },
    ];

    // Revenue by booking type
    const dailyBookings = bookings.filter((b) => b.bookingType === "DAILY");
    const monthlyBookings = bookings.filter((b) => b.bookingType === "MONTHLY");

    const bookingTypeBreakdown = [
      {
        type: "Daily",
        bookings: dailyBookings.length,
        revenue: dailyBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        percentage:
          allBookings.length > 0
            ? Math.round((dailyBookings.length / allBookings.length) * 100)
            : 0,
      },
      {
        type: "Monthly",
        bookings: monthlyBookings.length,
        revenue: monthlyBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        percentage:
          allBookings.length > 0
            ? Math.round((monthlyBookings.length / allBookings.length) * 100)
            : 0,
      },
    ];

    return NextResponse.json({
      data: {
        revenueByPeriod,
        roomBreakdown,
        bookingTypeBreakdown,
      },
    });
  } catch (error) {
    console.error("[REVENUE_ANALYTICS]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
