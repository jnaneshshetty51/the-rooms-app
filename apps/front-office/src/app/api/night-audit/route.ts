import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, Prisma } from "@the-rooms/db";
import { created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { createAuditLog, getClientIp, verifyPropertyAccess } from "@the-rooms/api/middleware";

// ─── Post Room Charges ─────────────────────────────────────────────────────────
// POST /api/night-audit

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
