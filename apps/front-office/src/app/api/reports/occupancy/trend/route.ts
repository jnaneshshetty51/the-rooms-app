import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getOccupancyTrend } from "@the-rooms/db/queries/reportQueries";

// GET /api/reports/occupancy/trend - Get occupancy trend
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view occupancy reports");
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") || "default";
        const days = parseInt(searchParams.get("days") || "30", 10);

        const trend = await getOccupancyTrend(propertyId, days);

        return ok(trend);
    } catch (error) {
        console.error("Error fetching occupancy trend:", error);
        return serverError();
    }
}
