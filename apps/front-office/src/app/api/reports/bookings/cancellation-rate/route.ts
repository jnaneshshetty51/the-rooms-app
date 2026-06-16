import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getCancellationRate } from "@the-rooms/db/queries/cancellationQueries";

// GET /api/reports/bookings/cancellation-rate - Get cancellation rate
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view cancellation reports");
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") || "default";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!startDate || !endDate) {
            return badRequest("startDate and endDate are required");
        }

        const rate = await getCancellationRate(
            propertyId,
            new Date(startDate),
            new Date(endDate)
        );

        return ok(rate);
    } catch (error) {
        console.error("Error fetching cancellation rate:", error);
        return serverError();
    }
}
