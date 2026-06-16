import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getCancellationReport, getCancelledBookings } from "@the-rooms/db/queries/cancellationQueries";

// GET /api/reports/bookings/cancellations - Get cancellation report
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view cancellation reports");
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
            const cancellations = await getCancelledBookings(
                propertyId,
                new Date(startDate),
                new Date(endDate)
            );
            return ok(cancellations);
        }

        const report = await getCancellationReport(
            propertyId,
            new Date(startDate),
            new Date(endDate)
        );

        return ok(report);
    } catch (error) {
        console.error("Error fetching cancellation report:", error);
        return serverError();
    }
}
