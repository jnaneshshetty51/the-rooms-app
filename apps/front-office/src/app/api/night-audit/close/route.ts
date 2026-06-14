import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, Prisma } from "@the-rooms/db";
import { badRequest, created, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { createAuditLog, getClientIp, verifyPropertyAccess } from "@the-rooms/api/middleware";

// ─── Close Day ────────────────────────────────────────────────────────────────
// POST /api/night-audit/close

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
        const { date, propertyId = "default", notes } = body;

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

        const closeDate = new Date(date);
        closeDate.setHours(0, 0, 0, 0);

        // Check if date is already closed
        const existingClose = await db.propertyDailyClose.findFirst({
            where: { propertyId, closeDate },
        });

        if (existingClose) {
            return badRequest("This date has already been closed");
        }

        // Verify no backdated entries after close
        const latestClose = await db.propertyDailyClose.findFirst({
            where: { propertyId },
            orderBy: { closeDate: "desc" },
        });

        if (latestClose && closeDate < latestClose.closeDate) {
            return badRequest("Cannot close a date earlier than the last closed date");
        }

        const endOfDay = new Date(closeDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Gather statistics for the day
        const [
            checkIns,
            checkOuts,
            checkedInToday,
            payments,
            roomCharges,
            occupiedRooms,
        ] = await Promise.all([
            // Expected check-ins
            db.booking.count({
                where: {
                    propertyId,
                    checkIn: { gte: closeDate, lte: endOfDay },
                    status: { in: ["CONFIRMED"] },
                },
            }),
            // Expected check-outs
            db.booking.count({
                where: {
                    propertyId,
                    checkOut: { gte: closeDate, lte: endOfDay },
                    status: { in: ["CONFIRMED", "CHECKED_IN"] },
                },
            }),
            // Actually checked-in today
            db.booking.count({
                where: {
                    propertyId,
                    checkInTime: { gte: closeDate, lte: endOfDay },
                    status: "CHECKED_IN",
                },
            }),
            // Payments received today
            db.payment.findMany({
                where: {
                    booking: { propertyId },
                    createdAt: { gte: closeDate, lte: endOfDay },
                    status: "PAID",
                },
            }),
            // Room charges posted today
            db.roomCharge.findMany({
                where: {
                    propertyId,
                    chargeDate: { gte: closeDate, lte: endOfDay },
                },
            }),
            // Current occupied rooms
            db.room.count({
                where: { propertyId, status: "OCCUPIED" },
            }),
        ]);

        const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalCharges = roomCharges.reduce((sum, rc) => sum + Number(rc.totalAmount), 0);

        // Verify payments and detect discrepancies
        const discrepancies = [];
        for (const payment of payments) {
            if (!payment.invoice) {
                discrepancies.push({
                    paymentId: payment.id,
                    type: "UNVERIFIED_TRANSACTION" as const,
                    severity: "MEDIUM" as const,
                    description: `Payment of ₹${payment.amount} has no invoice`,
                    bookingId: payment.bookingId,
                });
            }
        }

        // Create close record
        const closeRecord = await db.propertyDailyClose.create({
            data: {
                propertyId,
                closeDate,
                closedById: session.user.id,
                totalCheckIns: checkIns,
                totalCheckOuts: checkOuts,
                totalOccupied: occupiedRooms,
                totalRevenue: new Prisma.Decimal(totalRevenue),
                totalPayments: payments.length,
                totalCharges: roomCharges.length,
                discrepancies: discrepancies.length,
                notes,
                roomChargesPosted: roomCharges.length > 0,
                roomChargesAmount: new Prisma.Decimal(totalCharges),
                reportGenerated: true,
            },
        });

        // Create discrepancy records
        for (const disc of discrepancies) {
            await db.auditDiscrepancy.create({
                data: {
                    propertyId,
                    dailyCloseId: closeRecord.id,
                    type: disc.type,
                    severity: disc.severity,
                    description: disc.description,
                    bookingId: disc.bookingId,
                    paymentId: disc.paymentId,
                },
            });
        }

        // Create audit log
        await createAuditLog({
            userId: session.user.id,
            action: "DAY_CLOSED",
            entity: "nightAudit",
            entityId: closeRecord.id,
            metadata: {
                date: closeDate.toISOString().split("T")[0],
                propertyId,
                totalCheckIns: checkIns,
                totalCheckOuts: checkOuts,
                totalOccupied: occupiedRooms,
                totalRevenue,
                totalPayments: payments.length,
                totalCharges: roomCharges.length,
                discrepancies: discrepancies.length,
            },
            ipAddress: getClientIp(request),
        });

        return created({
            id: closeRecord.id,
            date: closeDate.toISOString().split("T")[0],
            closedBy: session.user.id,
            summary: {
                totalCheckIns: checkIns,
                totalCheckOuts: checkOuts,
                actualCheckIns: checkedInToday,
                totalOccupied: occupiedRooms,
                totalPayments: payments.length,
                totalRevenue,
                totalCharges: roomCharges.length,
                discrepancies: discrepancies.length,
            },
            discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
        });
    } catch (error) {
        console.error("Error closing day:", error);
        return serverError("Failed to close day");
    }
}
