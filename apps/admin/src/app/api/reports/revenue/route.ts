// apps/admin/src/app/api/reports/revenue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "monthly"; // daily | weekly | monthly | yearly

    const now = new Date();
    let groupBy: string;
    let startDate: Date;

    switch (period) {
      case "daily":
        groupBy = "hour";
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        break;
      case "weekly":
        groupBy = "day";
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12 * 7);
        break;
      case "yearly":
        groupBy = "month";
        startDate = new Date(now.getFullYear() - 2, now.getMonth(), 1);
        break;
      default:
        groupBy = "month";
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    }

    // Revenue by period
    const paidBookings = await prisma.booking.findMany({
      where: {
        paymentStatus: "PAID",
        createdAt: { gte: startDate },
      },
      select: { totalAmount: true, createdAt: true },
    });

    // Group revenue
    const revenueByPeriod: Record<string, number> = {};
    for (const b of paidBookings) {
      const key =
        groupBy === "hour"
          ? `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}-${String(b.createdAt.getDate()).padStart(2, "0")}`
          : `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}`;
      revenueByPeriod[key] = (revenueByPeriod[key] ?? 0) + Number(b.totalAmount);
    }

    // Occupancy by room type
    const [studioRooms, premiumRooms] = await Promise.all([
      prisma.room.findMany({ where: { type: "STUDIO" }, select: { id: true } }),
      prisma.room.findMany({ where: { type: "PREMIUM" }, select: { id: true } }),
    ]);

    const studioIds = studioRooms.map((r) => r.id);
    const premiumIds = premiumRooms.map((r) => r.id);

    const [studioBookings, premiumBookings] = await Promise.all([
      prisma.booking.findMany({
        where: { roomId: { in: studioIds }, status: { in: ["CHECKED_IN", "CHECKED_OUT"] }, createdAt: { gte: startDate } },
        select: { checkIn: true, checkOut: true },
      }),
      prisma.booking.findMany({
        where: { roomId: { in: premiumIds }, status: { in: ["CHECKED_IN", "CHECKED_OUT"] }, createdAt: { gte: startDate } },
        select: { checkIn: true, checkOut: true },
      }),
    ]);

    // Occupancy rate per room type
    const totalDays = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    function calcOccupancy(bookings: { checkIn: Date; checkOut: Date }[], totalRooms: number) {
      if (totalRooms === 0) return 0;
      let occupiedRoomDays = 0;
      for (const b of bookings) {
        const ci = Math.max(b.checkIn.getTime(), startDate.getTime());
        const co = Math.min(b.checkOut.getTime(), now.getTime());
        if (co > ci) {
          occupiedRoomDays += (co - ci) / (1000 * 60 * 60 * 24);
        }
      }
      return Math.round((occupiedRoomDays / (totalDays * totalRooms)) * 100);
    }

    const occupancyByType = {
      STUDIO: calcOccupancy(studioBookings, studioRooms.length),
      PREMIUM: calcOccupancy(premiumBookings, premiumRooms.length),
    };

    // Monthly trends
    const monthlyStats = await prisma.booking.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const monthlyByMonth: Record<string, { count: number; revenue: number }> = {};
    for (const m of monthlyStats) {
      const key = `${m.createdAt.getFullYear()}-${String(m.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyByMonth[key]) monthlyByMonth[key] = { count: 0, revenue: 0 };
      monthlyByMonth[key].count += m._count.id;
      monthlyByMonth[key].revenue += Number(m._sum.totalAmount ?? 0);
    }

    // Cancellation rate
    const [totalCompleted, cancelled] = await Promise.all([
      prisma.booking.count({ where: { createdAt: { gte: startDate } } }),
      prisma.booking.count({ where: { status: "CANCELLED", createdAt: { gte: startDate } } }),
    ]);

    const cancellationRate = totalCompleted > 0 ? Math.round((cancelled / totalCompleted) * 100) : 0;

    // Summary
    const totalRevenue = paidBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const totalBookings = await prisma.booking.count({ where: { createdAt: { gte: startDate } } });

    return NextResponse.json({
      period,
      revenueByPeriod,
      occupancyByType,
      monthlyByMonth,
      summary: {
        totalRevenue,
        totalBookings,
        avgBookingValue: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
        cancellationRate,
        cancelledBookings: cancelled,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[REPORTS_REVENUE_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
