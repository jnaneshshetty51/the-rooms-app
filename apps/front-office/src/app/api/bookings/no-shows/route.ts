import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { verifyPropertyAccess } from "@the-rooms/api/middleware";
import { getNoShowBookings } from "@the-rooms/db";

// GET /api/bookings/no-shows - List all no-show bookings
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
        const propertyId = searchParams.get("propertyId") ?? "default";
        const page = parseInt(searchParams.get("page") ?? "1");
        const perPage = parseInt(searchParams.get("perPage") ?? "20");
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");

        // Property-based access control
        if (userRole !== "SUPER_ADMIN") {
            const hasAccess = await verifyPropertyAccess(
                session.user.id,
                propertyId,
                userRole
            );
            if (!hasAccess) {
                return forbidden("Access denied to this property");
            }
        }

        const startDate = startDateParam ? new Date(startDateParam) : undefined;
        const endDate = endDateParam ? new Date(endDateParam) : undefined;

        const result = await getNoShowBookings(propertyId, {
            page,
            perPage,
            startDate,
            endDate,
        });

        return ok(result);
    } catch (error) {
        console.error("Error fetching no-show bookings:", error);
        return serverError("Failed to fetch no-show bookings");
    }
}
