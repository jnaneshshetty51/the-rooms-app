import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { verifyPropertyAccess } from "@the-rooms/api/middleware";

// GET /api/night-audit/report
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized("Authentication required");
        }

        const userRole = session.user.role as string;
        if (userRole === "GUEST") {
            return forbidden("Access denied");
        }

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");
        const propertyId = searchParams.get("propertyId") ?? "default";
        const date = dateParam ? new Date(dateParam) : new Date();

        if (userRole !== "SUPER_ADMIN") {
            const hasAccess = await verifyPropertyAccess(session.user.id, propertyId, userRole);
            if (!hasAccess) {
                return forbidden("Access denied to this property");
            }
        }

        const closeDate = new Date(date);
        closeDate.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const closeRecord = await db.propertyDailyClose.findFirst({
            where: { propertyId, closeDate },
            include: { closedBy: { select: { id: true, name: true, email: true } } },
        });

        const [checkIns, checkOuts, checkedInBookings, payments, roomCharges, discrepancies] = await Promise.all([
            db.booking.findMany({
                where: {
                    propertyId,
                    checkIn: { gte: closeDate, lte: endOfDay },
                    status: { in: ["CONFIRMED"] },
                },
                include: {
                    guest: { select: { id: true, name: true, phone: true } },
                    room: { select: { id: true, roomNumber: true, type: true } },
                },
                orderBy: { checkIn: "asc" },
            }),
            db.booking.findMany({
                where: {
                    propertyId,
                    checkOut: { gte: closeDate, lte: endOfDay },
                    status: { in: ["CONFIRMED", "CHECKED_IN"] },
                },
                include: {
                    guest: { select: { id: true, name: true, phone: true } },
                    room: { select: { id: true, roomNumber: true, type: true } },
                },
                orderBy: { checkOut: "asc" },
            }),
            db.booking.findMany({
                where: {
                    propertyId,
                    checkInTime: { gte: closeDate, lte: endOfDay },
                    status: "CHECKED_IN",
                },
                include: {
                    guest: { select: { id: true, name: true, phone: true } },
                    room: { select: { id: true, roomNumber: true, type: true } },
                },
            }),
            db.payment.findMany({
                where: {
                    booking: { propertyId },
                    createdAt: { gte: closeDate, lte: endOfDay },
                    status: "PAID",
                },
                include: {
                    booking: {
                        include: {
                            guest: { select: { id: true, name: true, phone: true } },
                            room: { select: { id: true, roomNumber: true } },
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
            }),
            db.roomCharge.findMany({
                where: {
                    propertyId,
                    chargeDate: { gte: closeDate, lte: endOfDay },
                },
                include: {
                    booking: {
                        include: {
                            guest: { select: { id: true, name: true } },
                            room: { select: { id: true, roomNumber: true } },
                        },
                    },
                },
            }),
            db.auditDiscrepancy.findMany({
                where: { propertyId, dailyCloseId: closeRecord?.id ?? "none" },
                include: {
                    booking: {
                        include: {
                            guest: { select: { id: true, name: true } },
                            room: { select: { id: true, roomNumber: true } },
                        },
                    },
                },
                orderBy: { severity: "desc" },
            }),
        ]);

        const totalPaymentsAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalRoomCharges = roomCharges.reduce((sum, rc) => sum + Number(rc.totalAmount), 0);

        const roomStats = await db.room.groupBy({
            by: ["status"],
            where: { propertyId },
            _count: { id: true },
        });

        const occupiedCount = roomStats.find((r) => r.status === "OCCUPIED")?._count.id ?? 0;
        const vacantCount = roomStats.find((r) => r.status === "VACANT")?._count.id ?? 0;
        const maintenanceCount = roomStats.find((r) => r.status === "MAINTENANCE")?._count.id ?? 0;
        const totalRooms = await db.room.count({ where: { propertyId } });

        return ok({
            date: closeDate.toISOString().split("T")[0],
            isClosed: !!closeRecord,
            closeRecord,
            summary: {
                totalRooms,
                occupiedRooms: occupiedCount,
                vacantRooms: vacantCount,
                maintenanceRooms: maintenanceCount,
                occupancyRate: totalRooms > 0 ? ((occupiedCount / totalRooms) * 100).toFixed(1) : "0",
                expectedCheckIns: checkIns.length,
                actualCheckIns: checkedInBookings.length,
                expectedCheckOuts: checkOuts.length,
                totalPayments: payments.length,
                totalPaymentsAmount,
                totalRoomCharges,
                discrepanciesFound: discrepancies.length,
            },
            checkIns,
            checkOuts,
            checkedInBookings,
            payments,
            roomCharges,
            discrepancies,
            roomStats: {
                byStatus: roomStats.reduce((acc, r) => ({ ...acc, [r.status]: r._count.id }), {}),
            },
        });
    } catch (error) {
        console.error("Error fetching night audit report:", error);
        return serverError("Failed to fetch night audit report");
    }
}
