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

    // ─── Revenue by period ─────────────────────────────────────────────────────
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Fetch bookings and expenses for the year (to calculate all periods)
    const [yearlyBookings, yearlyExpenses] = await Promise.all([
      db.booking.findMany({
        where: { ...whereClause, createdAt: { gte: yearStart } },
        include: { room: { select: { type: true } } },
      }),
      db.expense.findMany({
        where: { date: { gte: yearStart } },
      }),
    ]);

    // Helper: calculate nights between two dates
    function getNights(checkIn: Date, checkOut: Date): number {
      return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Helper: calculate expenses for a period
    function sumExpenses(expenses: typeof yearlyExpenses, start: Date): number {
      return expenses
        .filter((e) => e.date >= start)
        .reduce((sum, e) => sum + Number(e.amount), 0);
    }

    // Helper: calculate ADR for a period
    function calculateAdr(periodBookings: typeof yearlyBookings): number {
      let totalNights = 0;
      for (const b of periodBookings) {
        totalNights += getNights(b.checkIn, b.checkOut);
      }
      const totalRevenue = periodBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
      return totalNights > 0 ? totalRevenue / totalNights : 0;
    }

    // Helper: get bookings for a period
    function getPeriodBookings(bookings: typeof yearlyBookings, start: Date) {
      return bookings.filter((b) => b.createdAt >= start);
    }

    // Calculate revenue by period with live data
    const todayBookings = getPeriodBookings(yearlyBookings, todayStart);
    const weekBookings = getPeriodBookings(yearlyBookings, weekStart);
    const monthBookings = getPeriodBookings(yearlyBookings, monthStart);

    const revenueByPeriod = [
      {
        label: "Today",
        grossRevenue: todayBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        expenses: sumExpenses(yearlyExpenses, todayStart),
        netRevenue: todayBookings.reduce((s, b) => s + Number(b.totalAmount), 0) - sumExpenses(yearlyExpenses, todayStart),
        bookings: todayBookings.length,
        adr: Math.round(calculateAdr(todayBookings)),
      },
      {
        label: "This Week",
        grossRevenue: weekBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        expenses: sumExpenses(yearlyExpenses, weekStart),
        netRevenue: weekBookings.reduce((s, b) => s + Number(b.totalAmount), 0) - sumExpenses(yearlyExpenses, weekStart),
        bookings: weekBookings.length,
        adr: Math.round(calculateAdr(weekBookings)),
      },
      {
        label: "This Month",
        grossRevenue: monthBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        expenses: sumExpenses(yearlyExpenses, monthStart),
        netRevenue: monthBookings.reduce((s, b) => s + Number(b.totalAmount), 0) - sumExpenses(yearlyExpenses, monthStart),
        bookings: monthBookings.length,
        adr: Math.round(calculateAdr(monthBookings)),
      },
      {
        label: "This Year",
        grossRevenue: yearlyBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        expenses: sumExpenses(yearlyExpenses, yearStart),
        netRevenue: yearlyBookings.reduce((s, b) => s + Number(b.totalAmount), 0) - sumExpenses(yearlyExpenses, yearStart),
        bookings: yearlyBookings.length,
        adr: Math.round(calculateAdr(yearlyBookings)),
      },
    ];

    // ─── Revenue by room type (This Month) ─────────────────────────────────────
    const studioBookings = monthBookings.filter((b) => b.room.type === "STUDIO");
    const premiumBookings = monthBookings.filter((b) => b.room.type === "PREMIUM");

    // Count daily vs monthly for each room type
    const studioDaily = studioBookings.filter((b) => b.bookingType === "DAILY").length;
    const studioMonthly = studioBookings.filter((b) => b.bookingType === "MONTHLY").length;
    const premiumDaily = premiumBookings.filter((b) => b.bookingType === "DAILY").length;
    const premiumMonthly = premiumBookings.filter((b) => b.bookingType === "MONTHLY").length;

    const roomBreakdown = [
      {
        type: "Studio",
        daily: studioDaily,
        monthly: studioMonthly,
        revenue: studioBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        percentage:
          monthBookings.length > 0
            ? Math.round((studioBookings.length / monthBookings.length) * 100)
            : 0,
      },
      {
        type: "Premium",
        daily: premiumDaily,
        monthly: premiumMonthly,
        revenue: premiumBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        percentage:
          monthBookings.length > 0
            ? Math.round((premiumBookings.length / monthBookings.length) * 100)
            : 0,
      },
    ];

    // ─── Revenue by booking type (This Month) ─────────────────────────────────
    const dailyBookings = monthBookings.filter((b) => b.bookingType === "DAILY");
    const monthlyBookingsType = monthBookings.filter((b) => b.bookingType === "MONTHLY");

    const bookingTypeBreakdown = [
      {
        type: "Daily",
        bookings: dailyBookings.length,
        revenue: dailyBookings.reduce((s, b) => s + Number(b.totalAmount), 0),
        percentage:
          monthBookings.length > 0
            ? Math.round((dailyBookings.length / monthBookings.length) * 100)
            : 0,
      },
      {
        type: "Monthly",
        bookings: monthlyBookingsType.length,
        revenue: monthlyBookingsType.reduce((s, b) => s + Number(b.totalAmount), 0),
        percentage:
          monthBookings.length > 0
            ? Math.round((monthlyBookingsType.length / monthBookings.length) * 100)
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
