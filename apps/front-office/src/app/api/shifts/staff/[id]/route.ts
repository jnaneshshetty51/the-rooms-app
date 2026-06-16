import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getStaffShifts } from "@the-rooms/db/queries/shiftQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// GET /api/shifts/staff/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const staffId = params.id;
        const userRole = session.user.role;
        const currentUserId = session.user.id;

        // Users can only view their own shifts unless ADMIN/SUPER_ADMIN
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole) && staffId !== currentUserId) {
            return forbidden("You can only view your own shifts");
        }

        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");

        if (!startDateParam || !endDateParam) {
            // Default to current week
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            const shifts = await getStaffShifts(staffId, startOfWeek, endOfWeek);
            return ok({ shifts });
        }

        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);

        const shifts = await getStaffShifts(staffId, startDate, endDate);

        return ok({ shifts });
    } catch (error) {
        console.error("Error fetching staff shifts:", error);
        return serverError();
    }
}
