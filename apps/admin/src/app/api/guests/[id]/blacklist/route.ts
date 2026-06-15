import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { addToBlacklist, removeFromBlacklist, syncGuestBlacklistFlag } from "@the-rooms/db";
import { ok, serverError } from "@the-rooms/api";

// POST /api/guests/[id]/blacklist - Blacklist or unblacklist a guest
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { blacklist, reason } = body;

        if (blacklist) {
            // Add to blacklist
            await addToBlacklist(id, reason || "No reason provided", null, null, null);
        } else {
            // Remove from blacklist
            await removeFromBlacklist(id);
        }

        // Sync the flag on Guest model
        const guest = await syncGuestBlacklistFlag(id);

        return ok(guest);
    } catch (error) {
        console.error("Error updating blacklist status:", error);
        return serverError("Failed to update blacklist status");
    }
}
