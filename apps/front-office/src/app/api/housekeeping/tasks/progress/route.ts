import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { getHousekeepingTaskProgress } from "@the-rooms/db/queries/staffQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// GET /api/housekeeping/tasks/progress
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");
        const propertyId = searchParams.get("propertyId") || "default";

        if (!dateParam) {
            return badRequest("Date is required");
        }

        const date = new Date(dateParam);
        const progress = await getHousekeepingTaskProgress(date, propertyId);

        return ok(progress);
    } catch (error) {
        console.error("Error fetching housekeeping task progress:", error);
        return serverError();
    }
}
