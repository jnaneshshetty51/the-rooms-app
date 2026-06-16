import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getAttendanceReport } from "@the-rooms/db/queries/shiftQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// GET /api/attendance/report
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Only ADMIN and SUPER_ADMIN can view attendance reports
        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to view attendance reports");
        }

        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");
        const department = searchParams.get("department") as any;
        const propertyId = searchParams.get("propertyId") || "default";

        if (!startDateParam || !endDateParam) {
            return badRequest("startDate and endDate are required");
        }

        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);

        const report = await getAttendanceReport(startDate, endDate, department, propertyId);

        return ok(report);
    } catch (error) {
        console.error("Error fetching attendance report:", error);
        return serverError();
    }
}
