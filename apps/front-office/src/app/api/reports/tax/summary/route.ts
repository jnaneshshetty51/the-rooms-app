import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getTaxSummary } from "@the-rooms/db/queries/taxReportQueries";

// GET /api/reports/tax/summary - Get tax summary
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
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!startDate || !endDate) {
            return badRequest("startDate and endDate are required");
        }

        const summary = await getTaxSummary(
            propertyId,
            new Date(startDate),
            new Date(endDate)
        );

        return ok(summary);
    } catch (error) {
        console.error("Error fetching tax summary:", error);
        return serverError();
    }
}
