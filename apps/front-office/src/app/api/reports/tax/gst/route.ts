import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getGSTReport } from "@the-rooms/db/queries/taxReportQueries";

// GET /api/reports/tax/gst - Get GST report
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to view tax reports");
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") || "default";
        const month = parseInt(searchParams.get("month") || "1", 10);
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString(), 10);

        if (month < 1 || month > 12) {
            return badRequest("month must be between 1 and 12");
        }

        const report = await getGSTReport(propertyId, month, year);

        return ok(report);
    } catch (error) {
        console.error("Error fetching GST report:", error);
        return serverError();
    }
}
