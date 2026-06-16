// apps/front-office/src/app/api/channels/[id]/sync/bulk/route.ts
// POST /api/channels/[id]/sync/bulk - Bulk sync all room types

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { bulkSyncPrices } from "@the-rooms/db/queries/channelSyncQueries";

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
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to bulk sync channels");
        }

        const { id } = await params;

        const result = await bulkSyncPrices(id);

        return ok({
            message: "Bulk sync completed successfully",
            ...result,
        });
    } catch (error) {
        console.error("Error performing bulk sync:", error);
        const message = error instanceof Error ? error.message : "Failed to perform bulk sync";
        if (message === 'Channel not found') {
            return unauthorized("Channel not found");
        }
        return serverError();
    }
}