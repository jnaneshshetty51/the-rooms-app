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

    // Get future reservations (CONFIRMED bookings with checkIn > today)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const reservations = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        checkIn: { gt: tomorrow },
      },
      select: {
        id: true,
        bookingNumber: true,
        checkIn: true,
        guest: { select: { name: true, phone: true } },
        room: { select: { roomNumber: true, type: true } },
      },
      orderBy: { checkIn: "asc" },
      take: 50,
    });

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
      reservations,
      inHouseCount,
      todayRevenue: Number(todayPayments._sum.amount ?? 0),
      pendingTasks: openComplaints,
      summary: {
        pendingCheckIns: checkIns.filter((b) => b.status === "CONFIRMED").length,
        pendingCheckOuts: checkOuts.filter((b) => b.status === "CHECKED_IN").length,
        openComplaints,
        reservationCount: reservations.length,
      },
    });
  } catch (error) {
    console.error("Error fetching today's data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
