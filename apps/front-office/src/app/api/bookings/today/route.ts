import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getBookingsByDate } from "@the-rooms/db";
import prisma from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const { checkIns, checkOuts } = await getBookingsByDate(today);

    const inHouseCount = await prisma.booking.count({ where: { status: "CHECKED_IN" } });

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const todayPayments = await prisma.payment.aggregate({
      where: { createdAt: { gte: startOfDay, lte: endOfDay }, status: "PAID" },
      _sum: { amount: true },
    });

    const openComplaints = await prisma.complaint.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    });

    return NextResponse.json({
      date: today.toISOString().split("T")[0],
      arrivals: checkIns,
      departures: checkOuts,
      inHouseCount,
      todayRevenue: Number(todayPayments._sum.amount ?? 0),
      pendingTasks: openComplaints,
      summary: {
        pendingCheckIns: checkIns.filter((b) => b.status === "CONFIRMED").length,
        pendingCheckOuts: checkOuts.filter((b) => b.status === "CHECKED_IN").length,
        openComplaints,
      },
    });
  } catch (error) {
    console.error("Error fetching today's data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
