// apps/front-office/src/app/api/ota/alerts/route.ts
// GET /api/ota/alerts - Get sync alerts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getSyncAlerts } from "@the-rooms/db/queries/otaSyncQueries";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view sync alerts");
        }

        const { searchParams } = new URL(request.url);
        const includeAcknowledged = searchParams.get("includeAcknowledged") === "true";

        const alerts = await getSyncAlerts(includeAcknowledged);

        return ok(alerts);
    } catch (error) {
        console.error("Error fetching sync alerts:", error);
        return serverError();
    }
}