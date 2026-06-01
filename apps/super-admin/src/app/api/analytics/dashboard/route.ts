// apps/super-admin/src/app/api/analytics/dashboard/route.ts
// RevPAR = Total Room Revenue / Total Available Room-Days
// ADR = Total Room Revenue / Rooms Sold (occupied nights)
import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [totalRooms, monthlyPaidBookings, yearlyPaidBookings, roomStatusCounts] =
      await Promise.all([
        db.room.count(),
        db.booking.findMany({
          where: {
            createdAt: { gte: startOfMonth },
            paymentStatus: "PAID",
          },
          select: {
            totalAmount: true,
            checkIn: true,
            checkOut: true,
            room: { select: { type: true } },
          },
        }),
        db.booking.findMany({
          where: {
            createdAt: { gte: startOfYear },
            paymentStatus: "PAID",
          },
          select: { totalAmount: true },
        }),
        db.room.groupBy({ by: ["status"], _count: { id: true } }),
      ]);

    // MRR: total revenue this month
    const mrr = monthlyPaidBookings.reduce((s, b) => s + Number(b.totalAmount), 0);
    const arr = yearlyPaidBookings.reduce((s, b) => s + Number(b.totalAmount), 0);

    // Gross vs Net (MTD) — subtract expenses
    const monthlyExpenses = await db.expense.aggregate({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    });
    const netRevenue = mrr - Number(monthlyExpenses._sum.amount ?? 0);

    // Active bookings
    const activeBookings = await db.booking.count({
      where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    });

    // Calculate occupied room-days this month for occupancy rate
    // For each booking, count how many nights it occupied during this month
    const daysInMonth = endOfMonth.getDate();
    const totalAvailableRoomDays = totalRooms * daysInMonth;
    let occupiedRoomDays = 0;

    for (const booking of monthlyPaidBookings) {
      const bStart = booking.checkIn < startOfMonth ? startOfMonth : booking.checkIn;
      const bEnd = booking.checkOut > endOfMonth ? endOfMonth : booking.checkOut;
      if (bStart < bEnd) {
        // count nights: checkout day doesn't count as occupied
        const nights = Math.ceil(
          (bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        occupiedRoomDays += nights;
      }
    }

    // Occupancy Rate = occupied room-days / available room-days
    const occupancyRate =
      totalAvailableRoomDays > 0
        ? (occupiedRoomDays / totalAvailableRoomDays) * 100
        : 0;

    // ADR = Total Room Revenue / Rooms Sold (occupied nights)
    const adr = occupiedRoomDays > 0 ? mrr / occupiedRoomDays : 0;

    // RevPAR = Total Room Revenue / Total Available Room-Days
    // = ADR × Occupancy Rate (when using same basis)
    const revpar =
      totalAvailableRoomDays > 0 ? mrr / totalAvailableRoomDays : 0;

    // Room stats
    const occupiedCount =
      roomStatusCounts.find((r) => r.status === "OCCUPIED")?._count.id ?? 0;
    const availableRooms = totalRooms - occupiedCount;

    // Today's arrivals
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const checkedInToday = await db.booking.count({
      where: {
        status: "CHECKED_IN",
        checkInTime: { gte: todayStart, lt: todayEnd },
      },
    });
    const pendingCheckIns = await db.booking.count({
      where: {
        status: "CONFIRMED",
        checkIn: { gte: todayStart, lt: todayEnd },
      },
    });

    // Recent audit logs
    const recentAudit = await db.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({
      data: {
        mrr,
        arr,
        grossRevenue: mrr,
        netRevenue,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        occupiedRoomDays,
        totalAvailableRoomDays,
        activeBookings,
        adr: Math.round(adr),
        revpar: Math.round(revpar),
        totalRooms,
        availableRooms,
        occupiedCount,
        checkedInToday,
        pendingCheckIns,
      },
      recentAudit: recentAudit.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
        user: log.user
          ? { name: log.user.name, email: log.user.email }
          : undefined,
      })),
    });
  } catch (error) {
    console.error("[DASHBOARD_ANALYTICS]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
