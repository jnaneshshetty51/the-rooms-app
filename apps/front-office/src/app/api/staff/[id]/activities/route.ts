import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getStaffActivities } from "@the-rooms/db/queries/staffActivityQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// GET /api/staff/[id]/activities
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const { id } = await params; const staffId = id;
        const userRole = session.user.role;
        const currentUserId = session.user.id;

        // Users can only view their own activities unless ADMIN/SUPER_ADMIN
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole) && staffId !== currentUserId) {
            return forbidden("You can only view your own activities");
        }

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const action = searchParams.get("action") || undefined;
        const entityType = searchParams.get("entityType") || undefined;

        const date = dateParam ? new Date(dateParam) : undefined;

        const result = await getStaffActivities(staffId, date, { limit, offset, action, entityType });

        return ok(result);
    } catch (error) {
        console.error("Error fetching staff activities:", error);
        return serverError();
    }
}
