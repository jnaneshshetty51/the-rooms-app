import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { createAuditLog, getClientIp, verifyPropertyAccess } from "@the-rooms/api/middleware";
import { z } from "zod";
import { approveStayModificationRequest, rejectStayModificationRequest, getStayModificationRequestById } from "@the-rooms/db";

// ─── Request Schema ────────────────────────────────────────────────────────────

const updateRequestSchema = z.object({
    action: z.enum(["APPROVE", "REJECT"]),
    extraChargeAmount: z.number().optional(),
    chargeDescription: z.string().optional(),
    rejectionReason: z.string().optional(),
});

// PATCH /api/bookings/[id]/stay-modification/[requestId] - Approve or reject a request
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; requestId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized("Authentication required");
        }

        const { id: bookingId, requestId } = await params;
        const userRole = session.user.role as string;

        // Only FRONT_OFFICE, ADMIN, and SUPER_ADMIN can approve/reject
        if (userRole === "GUEST") {
            return forbidden("Access denied");
        }

        // Get the booking to check property access
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            select: { id: true, propertyId: true },
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

        // Get the stay modification request
        const stayRequest = await getStayModificationRequestById(requestId);
        if (!stayRequest) {
            return badRequest("Stay modification request not found");
        }

        if (stayRequest.bookingId !== bookingId) {
            return badRequest("Request does not belong to this booking");
        }

        if (stayRequest.status !== "PENDING") {
            return badRequest(`Request is not pending. Current status: ${stayRequest.status}`);
        }

        // Parse and validate request body
        const body = await request.json();
        const parseResult = updateRequestSchema.safeParse(body);

        if (!parseResult.success) {
            return badRequest(`Invalid request: ${parseResult.error.errors.map(e => e.message).join(", ")}`);
        }

        const { action, extraChargeAmount, chargeDescription, rejectionReason } = parseResult.data;

        let result;
        let auditAction: string;
        let auditMetadata: Record<string, unknown>;

        if (action === "APPROVE") {
            result = await approveStayModificationRequest(requestId, {
                extraChargeAmount,
                chargeDescription,
                approvedById: session.user.id,
            });
            auditAction = "STAY_MODIFICATION_APPROVED";
            auditMetadata = {
                requestId,
                type: stayRequest.type,
                originalCheckIn: stayRequest.originalCheckIn,
                originalCheckOut: stayRequest.originalCheckOut,
                requestedCheckIn: stayRequest.requestedCheckIn,
                requestedCheckOut: stayRequest.requestedCheckOut,
                extraChargeAmount: extraChargeAmount ?? stayRequest.extraChargeAmount?.toNumber() ?? 0,
                chargeDescription: chargeDescription ?? stayRequest.chargeDescription,
            };
        } else {
            result = await rejectStayModificationRequest(requestId, session.user.id, rejectionReason);
            auditAction = "STAY_MODIFICATION_REJECTED";
            auditMetadata = {
                requestId,
                type: stayRequest.type,
                rejectionReason,
            };
        }

        // Create audit log
        await createAuditLog({
            userId: session.user.id,
            action: auditAction,
            entity: "booking",
            entityId: bookingId,
            metadata: auditMetadata,
            ipAddress: getClientIp(request),
        });

        return ok({
            id: result.id,
            status: result.status,
            approvedAt: result.approvedAt,
            message: action === "APPROVE"
                ? "Stay modification request approved"
                : "Stay modification request rejected",
        });
    } catch (error) {
        console.error("Error updating stay modification request:", error);
        if (error instanceof Error) {
            if (error.message.includes("not found")) {
                return badRequest(error.message);
            }
            if (error.message.includes("not pending")) {
                return badRequest(error.message);
            }
        }
        return serverError("Failed to update stay modification request");
    }
}
