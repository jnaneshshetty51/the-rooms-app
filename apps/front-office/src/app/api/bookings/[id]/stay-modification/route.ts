import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { createAuditLog, getClientIp, verifyPropertyAccess } from "@the-rooms/api/middleware";
import { z } from "zod";
import { createStayModificationRequest, getPendingRequestByBookingId, getStayModificationPolicy, calculateStayModificationCharge } from "@the-rooms/db";

// ─── Request Schema ────────────────────────────────────────────────────────────

const createRequestSchema = z.object({
    type: z.enum(["EARLY_CHECKIN", "LATE_CHECKOUT"]),
    requestedCheckIn: z.string().datetime().optional(),
    requestedCheckOut: z.string().datetime().optional(),
    reason: z.string().optional(),
    notes: z.string().optional(),
});

// GET /api/bookings/[id]/stay-modification - Get pending stay modification request
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

        // Only FRONT_OFFICE, ADMIN, and SUPER_ADMIN can view
        if (userRole === "GUEST") {
            return forbidden("Access denied");
        }

        // Get the booking to check property access
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            select: { id: true, propertyId: true, status: true },
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

        // Get pending request
        const pendingRequest = await getPendingRequestByBookingId(bookingId);

        if (!pendingRequest) {
            return ok({ hasPendingRequest: false });
        }

        // Get policy for calculating potential charges
        const policy = await getStayModificationPolicy(booking.propertyId);

        return ok({
            hasPendingRequest: true,
            request: {
                id: pendingRequest.id,
                type: pendingRequest.type,
                status: pendingRequest.status,
                originalCheckIn: pendingRequest.originalCheckIn,
                originalCheckOut: pendingRequest.originalCheckOut,
                requestedCheckIn: pendingRequest.requestedCheckIn,
                requestedCheckOut: pendingRequest.requestedCheckOut,
                reason: pendingRequest.reason,
                notes: pendingRequest.notes,
                extraChargeAmount: pendingRequest.extraChargeAmount?.toNumber() ?? 0,
                chargeDescription: pendingRequest.chargeDescription,
                createdAt: pendingRequest.createdAt,
            },
            policy,
        });
    } catch (error) {
        console.error("Error getting stay modification request:", error);
        return serverError("Failed to get stay modification request");
    }
}

// POST /api/bookings/[id]/stay-modification - Create a new stay modification request
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

        // Only FRONT_OFFICE, ADMIN, and SUPER_ADMIN can create requests
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

        // Check if booking is in valid status (CONFIRMED or CHECKED_IN)
        if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_IN") {
            return badRequest(`Cannot request stay modification. Current booking status: ${booking.status}`);
        }

        // Parse and validate request body
        const body = await request.json();
        const parseResult = createRequestSchema.safeParse(body);

        if (!parseResult.success) {
            return badRequest(`Invalid request: ${parseResult.error.errors.map(e => e.message).join(", ")}`);
        }

        const { type, requestedCheckIn, requestedCheckOut, reason, notes } = parseResult.data;

        // Check if there's already a pending request
        const existingRequest = await getPendingRequestByBookingId(bookingId);
        if (existingRequest) {
            return badRequest("A stay modification request is already pending for this booking");
        }

        // Get policy
        const policy = await getStayModificationPolicy(booking.propertyId);

        // Validate the request based on type
        if (type === "EARLY_CHECKIN" && !policy.earlyCheckinEnabled) {
            return badRequest("Early check-in is not available");
        }

        if (type === "LATE_CHECKOUT" && !policy.lateCheckoutEnabled) {
            return badRequest("Late check-out is not available");
        }

        // Parse dates
        const requestedCheckInDate = requestedCheckIn ? new Date(requestedCheckIn) : undefined;
        const requestedCheckOutDate = requestedCheckOut ? new Date(requestedCheckOut) : undefined;

        // For early check-in, validate the requested time is actually early
        if (type === "EARLY_CHECKIN" && requestedCheckInDate) {
            const standardCheckInHour = 14; // Standard check-in is 2 PM
            if (requestedCheckInDate.getHours() >= standardCheckInHour) {
                return badRequest("Early check-in request time must be before standard check-in time (2 PM)");
            }
        }

        // For late check-out, validate the requested time is actually late
        if (type === "LATE_CHECKOUT" && requestedCheckOutDate) {
            if (requestedCheckOutDate.getHours() <= policy.lateCheckoutCutoffHour) {
                return badRequest(`Late check-out request time must be after ${policy.lateCheckoutCutoffHour}:00`);
            }
            if (requestedCheckOutDate.getHours() > policy.lateCheckoutMaxHour) {
                return badRequest(`Late check-out not available after ${policy.lateCheckoutMaxHour}:00`);
            }
        }

        // Calculate potential charge
        const requestedTime = type === "EARLY_CHECKIN"
            ? (requestedCheckInDate || booking.checkIn)
            : (requestedCheckOutDate || booking.checkOut);

        const { amount, description } = await calculateStayModificationCharge(
            bookingId,
            type,
            requestedTime,
            policy
        );

        // Create the request
        const stayRequest = await createStayModificationRequest({
            bookingId,
            type,
            requestedCheckIn: requestedCheckInDate,
            requestedCheckOut: requestedCheckOutDate,
            reason,
            notes,
        });

        // Create audit log
        await createAuditLog({
            userId: session.user.id,
            action: "STAY_MODIFICATION_REQUESTED",
            entity: "booking",
            entityId: bookingId,
            metadata: {
                requestId: stayRequest.id,
                type,
                requestedCheckIn: requestedCheckInDate,
                requestedCheckOut: requestedCheckOutDate,
                extraCharge: amount,
                chargeDescription: description,
                reason,
            },
            ipAddress: getClientIp(request),
        });

        return created({
            id: stayRequest.id,
            type: stayRequest.type,
            status: stayRequest.status,
            originalCheckIn: stayRequest.originalCheckIn,
            originalCheckOut: stayRequest.originalCheckOut,
            requestedCheckIn: stayRequest.requestedCheckIn,
            requestedCheckOut: stayRequest.requestedCheckOut,
            reason: stayRequest.reason,
            notes: stayRequest.notes,
            extraChargeAmount: amount,
            chargeDescription: description,
            message: amount > 0
                ? `Request created. Estimated charge: ₹${amount.toFixed(2)}`
                : "Request created. No extra charge applies.",
        });
    } catch (error) {
        console.error("Error creating stay modification request:", error);
        return serverError("Failed to create stay modification request");
    }
}
