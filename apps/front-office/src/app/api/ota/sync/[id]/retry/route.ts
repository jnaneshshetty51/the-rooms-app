// apps/front-office/src/app/api/ota/sync/[id]/retry/route.ts
// POST /api/ota/sync/[id]/retry - Retry a failed sync

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@the-rooms/api/response";
import { retrySync, getSyncLogById } from "@the-rooms/db/queries/otaSyncQueries";

export async function POST(
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
            return forbidden("You don't have permission to retry syncs");
        }

        const { id } = await params;

        // Check if the sync log exists
        const syncLog = await getSyncLogById(id);
        if (!syncLog) {
            return notFound("Sync log");
        }

        // Retry the sync
        const newSyncLog = await retrySync(id);

        return ok({
            message: "Sync retry scheduled successfully",
            originalSyncId: id,
            newSyncId: newSyncLog.id,
            status: newSyncLog.status,
        });
    } catch (error) {
        console.error("Error retrying sync:", error);
        const message = error instanceof Error ? error.message : "Failed to retry sync";
        if (message.includes("not found")) {
            return notFound("Sync log");
        }
        if (message.includes("Only failed")) {
            return forbidden(message);
        }
        return serverError();
    }
}