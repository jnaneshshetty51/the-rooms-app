// apps/front-office/src/app/api/ota/sync/health/route.ts
// GET /api/ota/sync/health - Get sync health metrics

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getSyncHealth } from "@the-rooms/db/queries/otaSyncQueries";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view sync health");
        }

        const { searchParams } = new URL(request.url);
        const channelId = searchParams.get("channelId") || undefined;

        const health = await getSyncHealth(channelId);

        return ok(health);
    } catch (error) {
        console.error("Error fetching sync health:", error);
        return serverError();
    }
}