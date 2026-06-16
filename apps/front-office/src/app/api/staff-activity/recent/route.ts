import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getRecentActivities } from "@the-rooms/db/queries/staffActivityQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// GET /api/staff-activity/recent - Recent activities
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Only ADMIN and SUPER_ADMIN can view recent activities
        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to view staff activities");
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const propertyId = searchParams.get("propertyId") || "default";

        const activities = await getRecentActivities(propertyId, limit);

        return ok({ activities });
    } catch (error) {
        console.error("Error fetching recent staff activities:", error);
        return serverError();
    }
}
