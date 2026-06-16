// apps/front-office/src/app/api/ota/sync/failures/route.ts
// GET /api/ota/sync/failures - List sync failures

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getSyncFailures } from "@the-rooms/db/queries/otaSyncQueries";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view sync failures");
        }

        const { searchParams } = new URL(request.url);
        const channelId = searchParams.get("channelId") || undefined;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const syncType = searchParams.get("syncType") || undefined;
        const status = searchParams.get("status") || 'FAILED';
        const page = parseInt(searchParams.get("page") || "1");
        const perPage = parseInt(searchParams.get("perPage") || "20");

        const result = await getSyncFailures({
            channelId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            syncType: syncType as any,
            status: status as any,
            page,
            perPage,
        });

        return ok(result);
    } catch (error) {
        console.error("Error fetching sync failures:", error);
        return serverError();
    }
}