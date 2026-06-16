import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import {
    generateDailyOccupancyReport,
    getDailyOccupancyReport,
    getOccupancyReports,
    getOccupancyTrend,
} from "@the-rooms/db/queries/reportQueries";

// ─── Daily Occupancy Report (Scenario 56) ────────────────────────────────────

// POST /api/reports/occupancy/daily - Generate report for date
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to generate occupancy reports");
        }

        const body = await request.json();
        const { propertyId = "default", date } = body;

        if (!date) {
            return badRequest("date is required");
        }

        const reportDate = new Date(date);
        const report = await generateDailyOccupancyReport(propertyId, reportDate);

        return ok(report);
    } catch (error) {
        console.error("Error generating daily occupancy report:", error);
        return serverError();
    }
}

// GET /api/reports/occupancy/daily - Get report for date
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
        const date = searchParams.get("date");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (date) {
            // Get specific date report
            const reportDate = new Date(date);
            const report = await getDailyOccupancyReport(propertyId, reportDate);
            return ok(report);
        } else if (startDate && endDate) {
            // Get date range reports
            const reports = await getOccupancyReports(
                propertyId,
                new Date(startDate),
                new Date(endDate)
            );
            return ok(reports);
        } else {
            return badRequest("date or startDate/endDate is required");
        }
    } catch (error) {
        console.error("Error fetching daily occupancy report:", error);
        return serverError();
    }
}
