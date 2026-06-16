// apps/front-office/src/app/api/channels/[id]/sync/history/route.ts
// GET /api/channels/[id]/sync/history - Get sync history

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getSyncHistory } from "@the-rooms/db/queries/channelSyncQueries";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view sync history");
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "20");

        const history = await getSyncHistory(id, limit);

        return ok(history);
    } catch (error) {
        console.error("Error fetching sync history:", error);
        return serverError();
    }
}