// apps/admin/src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);

    // Parallel queries for dashboard stats
    const [
      totalRooms,
      occupiedRooms,
      maintenanceRooms,
      todayCheckIns,
      todayCheckOuts,
      upcomingBookings,
      monthRevenueResult,
      recentBookings,
    ] = await Promise.all([
      // Room counts
      prisma.room.count(),

      // Occupied rooms (active bookings)
      prisma.room.count({
        where: { status: "OCCUPIED" },
      }),

      // Maintenance rooms
      prisma.room.count({
        where: { status: "MAINTENANCE" },
      }),

      // Today's check-ins
      prisma.booking.count({
        where: {
          checkIn: { gte: today, lt: tomorrow },
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
      }),

      // Today's check-outs
      prisma.booking.count({
        where: {
          checkOut: { gte: today, lt: tomorrow },
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
      }),

      // Upcoming bookings (next 7 days)
      prisma.booking.count({
        where: {
          checkIn: { gte: today, lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
          status: { in: ["CONFIRMED"] },
        },
      }),

      // Revenue MTD (from paid bookings this month)
      prisma.booking.aggregate({
        where: {
          paymentStatus: "PAID",
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // Recent bookings (last 5)
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          guest: { select: { name: true, phone: true } },
          room: { select: { roomNumber: true, type: true } },
        },
      }),
    ]);

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const monthRevenue = monthRevenueResult._sum.totalAmount
      ? Number(monthRevenueResult._sum.totalAmount)
      : 0;

    // Maintenance alerts
    const maintenanceAlerts = await prisma.room.findMany({
      where: { status: "MAINTENANCE" },
      select: { id: true, roomNumber: true, type: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    // Revenue trend (last 6 months)
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await prisma.booking.groupBy({
      by: ["createdAt"],
      where: {
        paymentStatus: "PAID",
        createdAt: { gte: sixMonthsAgo },
      },
      _sum: { totalAmount: true },
    });

    // Group by month
    const revenueByMonth: Record<string, number> = {};
    for (const entry of monthlyRevenue) {
      const monthKey = `${entry.createdAt.getFullYear()}-${String(entry.createdAt.getMonth() + 1).padStart(2, "0")}`;
      revenueByMonth[monthKey] =
        (revenueByMonth[monthKey] ?? 0) + Number(entry._sum.totalAmount ?? 0);
    }

    // ─── Occupancy by Day (last 30 days) ─────────────────────────────────
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const occupancyByDay: { date: string; occupancy: number }[] = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const bookingsOnDay = await prisma.booking.count({
        where: {
          status: { in: ["CHECKED_IN"] },
          checkIn: { lt: nextDate },
          checkOut: { gt: date },
        },
      });

      const occupancy = totalRooms > 0 ? Math.round((bookingsOnDay / totalRooms) * 100) : 0;
      occupancyByDay.push({
        date: date.toISOString().split("T")[0],
        occupancy,
      });
    }

    return NextResponse.json({
      stats: {
        occupancyRate,
        totalRooms,
        occupiedRooms,
        maintenanceRooms,
        todayCheckIns,
        todayCheckOuts,
        upcomingBookings,
        monthRevenue,
        monthBookingCount: monthRevenueResult._count.id,
      },
      maintenanceAlerts,
      recentBookings,
      revenueByMonth,
      occupancyByDay,
    });
  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
