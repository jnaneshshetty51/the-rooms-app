import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const totalRooms = await prisma.room.count();

    const [checkIns, checkOuts, checkedOutToday, payments, inHouseCount, openComplaints] = await Promise.all([
      prisma.booking.findMany({
        where: { checkIn: { gte: startOfDay, lte: endOfDay }, status: { in: ["CONFIRMED"] } },
        include: { guest: { select: { name: true, phone: true } }, room: { select: { roomNumber: true, type: true } } },
        orderBy: { checkIn: "asc" },
      }),
      prisma.booking.findMany({
        where: { checkOut: { gte: startOfDay, lte: endOfDay }, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
        include: { guest: { select: { name: true, phone: true } }, room: { select: { roomNumber: true, type: true } } },
        orderBy: { checkOut: "asc" },
      }),
      prisma.booking.findMany({
        where: { checkOutTime: { gte: startOfDay, lte: endOfDay }, status: "CHECKED_OUT" },
        include: { guest: { select: { name: true } }, room: { select: { roomNumber: true } }, payments: true },
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: startOfDay, lte: endOfDay }, status: "PAID" },
        include: { booking: { select: { guest: { select: { name: true } }, room: { select: { roomNumber: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count({ where: { status: "CHECKED_IN" } }),
      prisma.complaint.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]);

    const occupiedRooms = await prisma.room.count({ where: { status: "OCCUPIED" } });
    const vacantRooms = await prisma.room.count({ where: { status: "VACANT" } });
    const maintenanceRooms = await prisma.room.count({ where: { status: "MAINTENANCE" } });
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : "0";
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const [studioRooms, premiumRooms, studioOccupied, premiumOccupied] = await Promise.all([
      prisma.room.count({ where: { type: "STUDIO" } }),
      prisma.room.count({ where: { type: "PREMIUM" } }),
      prisma.room.count({ where: { type: "STUDIO", status: "OCCUPIED" } }),
      prisma.room.count({ where: { type: "PREMIUM", status: "OCCUPIED" } }),
    ]);

    return NextResponse.json({
      date: date.toISOString().split("T")[0],
      summary: { totalRooms, occupiedRooms, vacantRooms, maintenanceRooms, inHouseCount, occupancyRate: parseFloat(occupancyRate), totalRevenue, openComplaints },
      arrivals: checkIns,
      departures: checkOuts,
      checkedOutToday,
      paymentsToday: payments,
      roomTypeBreakdown: { studio: { total: studioRooms, occupied: studioOccupied }, premium: { total: premiumRooms, occupied: premiumOccupied } },
    });
  } catch (error) {
    console.error("Error generating daily report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
