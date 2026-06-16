// apps/front-office/src/app/api/channels/[id]/sync/status/route.ts
// GET /api/channels/[id]/sync/status - Get sync status

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@the-rooms/api/response";
import { getLastSyncStatus } from "@the-rooms/db/queries/channelSyncQueries";

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
            return forbidden("You don't have permission to view sync status");
        }

        const { id } = await params;

        const status = await getLastSyncStatus(id);

        if (!status) {
            return ok({
                message: "No sync history found for this channel",
                channelId: id,
                syncId: null,
                status: null,
            });
        }

        return ok(status);
    } catch (error) {
        console.error("Error fetching sync status:", error);
        return serverError();
    }
}