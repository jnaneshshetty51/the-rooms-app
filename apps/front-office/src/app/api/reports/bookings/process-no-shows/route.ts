import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { processNoShows } from "@the-rooms/db/queries/noShowQueries";

// POST /api/reports/bookings/process-no-shows - Process no-shows for date
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to process no-shows");
        }

        const body = await request.json();
        const { propertyId = "default", date } = body;

        if (!date) {
            return badRequest("date is required");
        }

        const result = await processNoShows(propertyId, new Date(date));

        return ok(result);
    } catch (error) {
        console.error("Error processing no-shows:", error);
        return serverError();
    }
}
