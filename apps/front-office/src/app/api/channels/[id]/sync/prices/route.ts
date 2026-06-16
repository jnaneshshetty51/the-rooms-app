// apps/front-office/src/app/api/channels/[id]/sync/prices/route.ts
// POST /api/channels/[id]/sync/prices - Sync prices to channel

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, notFound, badRequest, serverError } from "@the-rooms/api/response";
import { syncPricesToChannel } from "@the-rooms/db/queries/channelSyncQueries";

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
            return forbidden("You don't have permission to sync prices to channels");
        }

        const { id } = await params;
        const body = await request.json();
        const { rates } = body;

        if (!rates || !Array.isArray(rates)) {
            return badRequest("Rates array is required");
        }

        // Validate rate structure
        for (const rate of rates) {
            if (!rate.roomTypeId || typeof rate.singleRate !== 'number' || typeof rate.doubleRate !== 'number') {
                return badRequest("Each rate must have roomTypeId, singleRate, and doubleRate");
            }
        }

        const result = await syncPricesToChannel(id, rates);

        return ok({
            message: "Price sync initiated successfully",
            syncLogId: result.syncLog.id,
            channelName: result.channel.displayName,
            ratesPrepared: rates.length,
            status: result.result.status,
        });
    } catch (error) {
        console.error("Error syncing prices:", error);
        const message = error instanceof Error ? error.message : "Failed to sync prices";
        if (message === 'Channel not found') {
            return notFound("Channel");
        }
        return serverError();
    }
}