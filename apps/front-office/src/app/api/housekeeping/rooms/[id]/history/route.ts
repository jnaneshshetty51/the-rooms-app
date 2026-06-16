import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, serverError } from "@the-rooms/api/response";
import { getHousekeepingTaskHistory } from "@the-rooms/db/queries/staffQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// GET /api/housekeeping/rooms/[id]/history
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const { id } = await params; const roomId = id;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "30");

        const history = await getHousekeepingTaskHistory(roomId, limit);

        return ok({ history });
    } catch (error) {
        console.error("Error fetching room housekeeping history:", error);
        return serverError();
    }
}
