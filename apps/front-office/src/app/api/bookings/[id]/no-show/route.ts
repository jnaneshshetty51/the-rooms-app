import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, Prisma } from "@the-rooms/db";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { createAuditLog, getClientIp, verifyPropertyAccess } from "@the-rooms/api/middleware";
import { calculateNoShowCharge, getNoShowPolicy, markBookingAsNoShow } from "@the-rooms/db";

// POST /api/bookings/[id]/no-show - Manually mark a booking as no-show
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized("Authentication required");
        }

        const { id: bookingId } = await params;
        const userRole = session.user.role as string;

        // Only FRONT_OFFICE, ADMIN, and SUPER_ADMIN can mark as no-show
        if (userRole === "GUEST") {
            return forbidden("Access denied");
        }

        // Get the booking to check property access
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: { property: true },
        });

        if (!booking) {
            return badRequest("Booking not found");
        }

        // Property-based access control
        if (userRole !== "SUPER_ADMIN") {
            const hasAccess = await verifyPropertyAccess(
                session.user.id,
                booking.propertyId,
                userRole
            );
            if (!hasAccess) {
                return forbidden("Access denied to this booking");
            }
        }

        // Check if booking can be marked as no-show
        if (booking.status !== "CONFIRMED") {
            return badRequest(`Cannot mark booking as no-show. Current status: ${booking.status}`);
        }

        // Get no-show policy
        const policy = await getNoShowPolicy(booking.propertyId);

        if (!policy.enabled) {
            return badRequest("No-show processing is disabled for this property");
        }

        // Calculate the no-show charge
        const { amount, description } = await calculateNoShowCharge(bookingId, policy);

        // Process the no-show in a transaction
        const result = await db.$transaction(async (tx) => {
            // Mark booking as no-show
            const noShowBooking = await markBookingAsNoShow(bookingId, amount, tx);

            // Create a payment record for the no-show charge
            const payment = await tx.payment.create({
                data: {
                    bookingId,
                    amount: new Prisma.Decimal(amount),
                    method: "CASH", // Default to CASH for no-show charges
                    status: "PENDING", // No-show charge is pending payment
                },
            });

            // Create audit log
            await tx.auditLog.create({
                data: {
                    userId: session.user.id,
                    bookingId,
                    action: "BOOKING_NO_SHOW",
                    entity: "booking",
                    entityId: bookingId,
                    metadata: {
                        bookingNumber: booking.bookingNumber,
                        noShowCharge: amount,
                        chargeDescription: description,
                        policy: {
                            chargeType: policy.chargeType,
                            chargeValue: policy.chargeValue,
                        },
                    },
                },
            });

            return { booking: noShowBooking, payment, chargeAmount: amount };
        });

        // Create audit log (outside transaction for logging purposes)
        await createAuditLog({
            userId: session.user.id,
            bookingId,
            action: "BOOKING_NO_SHOW",
            entity: "booking",
            entityId: bookingId,
            metadata: {
                bookingNumber: booking.bookingNumber,
                guestName: booking.guest.name,
                roomNumber: booking.room?.roomNumber,
                noShowCharge: amount,
                chargeDescription: description,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            success: true,
            bookingId: result.booking.id,
            bookingNumber: booking.bookingNumber,
            noShowCharge: amount,
            chargeDescription: description,
            paymentId: result.payment.id,
            message: `Booking marked as no-show. Charge of ₹${amount.toFixed(2)} applied.`,
        });
    } catch (error) {
        console.error("Error marking booking as no-show:", error);
        return serverError("Failed to mark booking as no-show");
    }
}

// GET /api/bookings/[id]/no-show - Get no-show details for a booking
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized("Authentication required");
        }

        const { id: bookingId } = await params;
        const userRole = session.user.role as string;

        if (userRole === "GUEST") {
            return forbidden("Access denied");
        }

        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                bookingNumber: true,
                status: true,
                noShowAt: true,
                noShowCharge: true,
                propertyId: true,
            },
        });

        if (!booking) {
            return badRequest("Booking not found");
        }

        // Property-based access control
        if (userRole !== "SUPER_ADMIN") {
            const hasAccess = await verifyPropertyAccess(
                session.user.id,
                booking.propertyId,
                userRole
            );
            if (!hasAccess) {
                return forbidden("Access denied to this booking");
            }
        }

        // If booking is a no-show, return details
        if (booking.status === "NO_SHOW") {
            const policy = await getNoShowPolicy(booking.propertyId);
            return ok({
                isNoShow: true,
                noShowAt: booking.noShowAt,
                noShowCharge: booking.noShowCharge?.toNumber() ?? 0,
                policy,
            });
        }

        // If booking is confirmed, return potential no-show info
        if (booking.status === "CONFIRMED") {
            const policy = await getNoShowPolicy(booking.propertyId);
            const { amount, description } = await calculateNoShowCharge(bookingId, policy);
            return ok({
                isNoShow: false,
                canMarkAsNoShow: true,
                potentialCharge: amount,
                chargeDescription: description,
                policy,
            });
        }

        return ok({
            isNoShow: false,
            canMarkAsNoShow: false,
            currentStatus: booking.status,
        });
    } catch (error) {
        console.error("Error getting no-show details:", error);
        return serverError("Failed to get no-show details");
    }
}
