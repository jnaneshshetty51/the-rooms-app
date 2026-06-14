import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { verifyPropertyAccess } from "@the-rooms/api/middleware";
import { getPendingStayModifications, getStayModificationPolicy } from "@the-rooms/db";

// GET /api/stay-modifications/pending - List all pending stay modification requests
export async function GET(
    request: NextRequest
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized("Authentication required");
        }

        const userRole = session.user.role as string;

        // Only FRONT_OFFICE, ADMIN, and SUPER_ADMIN can view
        if (userRole === "GUEST") {
            return forbidden("Access denied");
        }

        // Get property ID from query params if provided
        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") || undefined;

        // For non-SUPER_ADMIN, verify property access
        if (userRole !== "SUPER_ADMIN" && propertyId) {
            const hasAccess = await verifyPropertyAccess(
                session.user.id,
                propertyId,
                userRole
            );
            if (!hasAccess) {
                return forbidden("Access denied to this property");
            }
        }

        // Get pending requests
        const pendingRequests = await getPendingStayModifications(propertyId);

        // Get policy for reference
        const policy = await getStayModificationPolicy(propertyId || "default");

        // Format the response
        const formattedRequests = pendingRequests.map((request) => ({
            id: request.id,
            type: request.type,
            status: request.status,
            originalCheckIn: request.originalCheckIn,
            originalCheckOut: request.originalCheckOut,
            requestedCheckIn: request.requestedCheckIn,
            requestedCheckOut: request.requestedCheckOut,
            reason: request.reason,
            notes: request.notes,
            extraChargeAmount: request.extraChargeAmount?.toNumber() ?? 0,
            chargeDescription: request.chargeDescription,
            createdAt: request.createdAt,
            booking: {
                id: request.booking.id,
                bookingNumber: request.booking.bookingNumber,
                status: request.booking.status,
                checkIn: request.booking.checkIn,
                checkOut: request.booking.checkOut,
                guest: {
                    id: request.booking.guest.id,
                    name: request.booking.guest.name,
                    phone: request.booking.guest.phone,
                },
                room: {
                    id: request.booking.room.id,
                    roomNumber: request.booking.room.roomNumber,
                    type: request.booking.room.type,
                },
            },
        }));

        return ok({
            requests: formattedRequests,
            total: formattedRequests.length,
            policy,
        });
    } catch (error) {
        console.error("Error getting pending stay modification requests:", error);
        return serverError("Failed to get pending stay modification requests");
    }
}
