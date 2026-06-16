import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { calculateADR, getADRReport } from "@the-rooms/db/queries/reportQueries";

// GET /api/reports/revenue/adr - Get ADR
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view revenue reports");
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") || "default";
        const date = searchParams.get("date");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (date) {
            // Get specific date ADR
            const adr = await calculateADR(propertyId, new Date(date));
            return ok(adr);
        } else if (startDate && endDate) {
            // Get date range ADR report
            const report = await getADRReport(
                propertyId,
                new Date(startDate),
                new Date(endDate)
            );
            return ok(report);
        } else {
            return badRequest("date or startDate/endDate is required");
        }
    } catch (error) {
        console.error("Error fetching ADR report:", error);
        return serverError();
    }
}
