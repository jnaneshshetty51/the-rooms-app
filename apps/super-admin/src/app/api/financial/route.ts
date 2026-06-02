import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

function getDaysBetween(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  const days = Math.ceil(diff / (1000 * 3600 * 24));
  return days > 0 ? days : 1;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // Fetch all relevant data for the year to calculate periods
    const [bookings, expenses] = await Promise.all([
      db.booking.findMany({
        where: {
          createdAt: { gte: startOfYear },
          paymentStatus: "PAID",
        },
        include: { room: true },
      }),
      db.expense.findMany({
        where: { date: { gte: startOfYear } },
      }),
    ]);

    // Helper to calculate stats for a period
    const calculatePeriod = (label: string, startDate: Date) => {
      const periodBookings = bookings.filter((b) => b.createdAt >= startDate);
      const periodExpenses = expenses.filter((e) => e.date >= startDate);

      const grossRevenue = periodBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
      const totalExpenses = periodExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const netRevenue = grossRevenue - totalExpenses; // Used for "profit"
      
      let totalNights = 0;
      for (const b of periodBookings) {
        totalNights += getDaysBetween(b.checkIn, b.checkOut);
      }
      
      const adr = totalNights > 0 ? grossRevenue / totalNights : 0;

      return {
        label,
        grossRevenue,
        netRevenue: grossRevenue, // In this domain, net revenue is sometimes gross minus taxes, but we'll use gross for simplicity, and profit for net - expenses
        expenses: totalExpenses,
        profit: netRevenue,
        bookings: periodBookings.length,
        adr: Math.round(adr),
      };
    };

    const periods = [
      calculatePeriod("Today", startOfToday),
      calculatePeriod("This Week", startOfWeek),
      calculatePeriod("This Month", startOfMonth),
      calculatePeriod("This Year", startOfYear),
    ];

    // Room Breakdown (This Month)
    const monthlyBookings = bookings.filter((b) => b.createdAt >= startOfMonth);
    const roomBreakdownMap: Record<string, { daily: number; monthly: number; revenue: number }> = {};
    let totalMonthlyRev = 0;
    
    for (const b of monthlyBookings) {
      const type = b.room.type; // "STUDIO" | "PREMIUM"
      const typeName = type.charAt(0) + type.slice(1).toLowerCase();
      if (!roomBreakdownMap[typeName]) {
        roomBreakdownMap[typeName] = { daily: 0, monthly: 0, revenue: 0 };
      }
      if (b.bookingType === "DAILY") roomBreakdownMap[typeName].daily += 1;
      else roomBreakdownMap[typeName].monthly += 1;
      
      const rev = Number(b.totalAmount);
      roomBreakdownMap[typeName].revenue += rev;
      totalMonthlyRev += rev;
    }
    
    const roomBreakdown = Object.entries(roomBreakdownMap).map(([type, stats]) => ({
      type,
      daily: stats.daily,
      monthly: stats.monthly,
      revenue: stats.revenue,
      percentage: totalMonthlyRev > 0 ? Number(((stats.revenue / totalMonthlyRev) * 100).toFixed(1)) : 0,
    }));

    // Booking Type Breakdown (This Month)
    const bookingBreakdownMap: Record<string, { bookings: number; revenue: number }> = {};
    for (const b of monthlyBookings) {
      const type = b.bookingType; // "DAILY" | "MONTHLY"
      const typeName = type.charAt(0) + type.slice(1).toLowerCase();
      if (!bookingBreakdownMap[typeName]) {
        bookingBreakdownMap[typeName] = { bookings: 0, revenue: 0 };
      }
      bookingBreakdownMap[typeName].bookings += 1;
      bookingBreakdownMap[typeName].revenue += Number(b.totalAmount);
    }
    const bookingTypeBreakdown = Object.entries(bookingBreakdownMap).map(([type, stats]) => ({
      type,
      bookings: stats.bookings,
      revenue: stats.revenue,
      percentage: totalMonthlyRev > 0 ? Number(((stats.revenue / totalMonthlyRev) * 100).toFixed(1)) : 0,
    }));

    // Daily Trend (Last 7 Days)
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);

      const dayBookings = bookings.filter((b) => b.createdAt >= d && b.createdAt < nextDay);
      const dayRev = dayBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
      
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      dailyTrend.push({
        date: d.toLocaleDateString('en-US', options),
        revenue: dayRev,
      });
    }

    return NextResponse.json({
      data: {
        periods,
        roomBreakdown,
        bookingTypeBreakdown,
        dailyTrend,
        summary: {
          grossRevenue: periods[2].grossRevenue,
          expenses: periods[2].expenses,
          netProfit: periods[2].profit,
          netMargin: periods[2].grossRevenue > 0 ? ((periods[2].profit / periods[2].grossRevenue) * 100).toFixed(1) + "%" : "0%",
        }
      },
    });
  } catch (error) {
    console.error("[FINANCIAL_API]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
