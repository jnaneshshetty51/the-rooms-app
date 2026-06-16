import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getNoShowReport, getNoShowBookings } from "@the-rooms/db/queries/noShowQueries";

// GET /api/reports/bookings/no-shows - Get no-show report
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view no-show reports");
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") || "default";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const listOnly = searchParams.get("listOnly") === "true";

        if (!startDate || !endDate) {
            return badRequest("startDate and endDate are required");
        }

        if (listOnly) {
            const noShows = await getNoShowBookings(
                propertyId,
                new Date(startDate),
                new Date(endDate)
            );
            return ok(noShows);
        }

        const report = await getNoShowReport(
            propertyId,
            new Date(startDate),
            new Date(endDate)
        );

        return ok(report);
    } catch (error) {
        console.error("Error fetching no-show report:", error);
        return serverError();
    }
}
