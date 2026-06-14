import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, Prisma } from "@the-rooms/db";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { createAuditLog, getClientIp, verifyPropertyAccess } from "@the-rooms/api/middleware";

// ─── Night Audit Report ───────────────────────────────────────────────────────
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

        // Property-based access control
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

        // Get close record if exists
        const closeRecord = await db.propertyDailyClose.findFirst({
            where: { propertyId, closeDate },
            include: { closedBy: { select: { id: true, name: true, email: true } } },
        });

        // Get all bookings for the day
        const [checkIns, checkOuts, checkedInBookings, payments, roomCharges, discrepancies] = await Promise.all([
            // Expected check-ins
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
            // Expected check-outs
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
            // Actually checked-in today
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
            // Payments received today
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
            // Room charges posted today
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
            // Discrepancies for this close
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

        // Calculate totals
        const totalPaymentsAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalRoomCharges = roomCharges.reduce((sum, rc) => sum + Number(rc.totalAmount), 0);

        // Room statistics
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

// ─── Post Room Charges ─────────────────────────────────────────────────────────
// POST /api/night-audit/post-charges

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized("Authentication required");
        }

        const userRole = session.user.role as string;
        if (userRole === "GUEST" || userRole === "FRONT_OFFICE") {
            return forbidden("Access denied - insufficient permissions");
        }

        const body = await request.json();
        const { date, propertyId = "default" } = body;

        if (!date) {
            return badRequest("Date is required");
        }

        // Property-based access control
        if (userRole !== "SUPER_ADMIN") {
            const hasAccess = await verifyPropertyAccess(session.user.id, propertyId, userRole);
            if (!hasAccess) {
                return forbidden("Access denied to this property");
            }
        }

        const chargeDate = new Date(date);
        chargeDate.setHours(0, 0, 0, 0);

        // Check if date is already closed
        const existingClose = await db.propertyDailyClose.findFirst({
            where: { propertyId, closeDate: chargeDate },
        });

        if (existingClose) {
            return badRequest("Cannot post charges for a closed date");
        }

        // Get all checked-in bookings that should have room charges posted
        const bookings = await db.booking.findMany({
            where: {
                propertyId,
                status: "CHECKED_IN",
                checkIn: { lte: chargeDate },
                checkOut: { gt: chargeDate },
            },
            include: {
                room: true,
                guest: { select: { id: true, name: true } },
            },
        });

        const hotelSettings = await db.hotelSettings.findUnique({
            where: { id: propertyId === "default" ? "default" : propertyId },
        });
        const extraGuestRateDaily = hotelSettings?.extraGuestRateDaily?.toNumber() ?? 500;

        const results = [];
        let totalCharged = 0;

        for (const booking of bookings) {
            // Check if charge already exists for this date
            const existingCharge = await db.roomCharge.findFirst({
                where: { bookingId: booking.id, chargeDate: chargeDate },
            });

            if (existingCharge) {
                results.push({
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    guestName: booking.guest.name,
                    roomNumber: booking.room.roomNumber,
                    status: "SKIPPED",
                    reason: "Already charged",
                });
                continue;
            }

            // Calculate room charge
            const isDouble = booking.guestsCount > 1;
            const baseRate = isDouble ? booking.room.basePriceDouble : booking.room.basePriceSingle;
            const extraGuests = Math.max(0, booking.guestsCount - 1);
            const extraGuestCharge = new Prisma.Decimal(extraGuestRateDaily * extraGuests);
            const subtotal = new Prisma.Decimal(baseRate.toNumber()).add(extraGuestCharge);
            const cgst = subtotal.mul(0.09);
            const sgst = subtotal.mul(0.09);
            const totalAmount = subtotal.add(cgst).add(sgst);

            const charge = await db.roomCharge.create({
                data: {
                    bookingId: booking.id,
                    propertyId,
                    chargeDate: chargeDate,
                    roomRate: baseRate,
                    extraGuestCharge,
                    subtotal,
                    cgst,
                    sgst,
                    totalAmount,
                    postedById: session.user.id,
                },
            });

            totalCharged += Number(totalAmount);
            results.push({
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                guestName: booking.guest.name,
                roomNumber: booking.room.roomNumber,
                status: "CREATED",
                chargeId: charge.id,
                amount: Number(totalAmount),
            });
        }

        // Create audit log
        await createAuditLog({
            userId: session.user.id,
            action: "ROOM_CHARGES_POSTED",
            entity: "nightAudit",
            entityId: propertyId,
            metadata: {
                date: chargeDate.toISOString().split("T")[0],
                propertyId,
                bookingsCharged: results.filter((r) => r.status === "CREATED").length,
                totalAmount: totalCharged,
            },
            ipAddress: getClientIp(request),
        });

        return created({
            date: chargeDate.toISOString().split("T")[0],
            totalCharged,
            totalBookings: bookings.length,
            results,
        });
    } catch (error) {
        console.error("Error posting room charges:", error);
        return serverError("Failed to post room charges");
    }
}
