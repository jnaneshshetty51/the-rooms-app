import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { markOfflineEntrySyncing, markOfflineEntrySynced, markOfflineEntryFailed } from "@the-rooms/db";

// POST /api/offline/entries/[id]/sync - Sync an offline entry
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

        // Mark as syncing
        await markOfflineEntrySyncing(id);

        // In a real implementation, this would create the actual booking
        // For now, we just mark it as synced
        const entry = await markOfflineEntrySynced(id, "mock-booking-id");

        return NextResponse.json({ entry, success: true });
    } catch (error) {
        console.error("Error syncing offline entry:", error);
        if (error instanceof Error && error.message === 'Offline entry not found') {
            return NextResponse.json({ error: "Offline entry not found" }, { status: 404 });
        }
        if (error instanceof Error && error.message === 'Entry already synced') {
            return NextResponse.json({ error: "Entry already synced" }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to sync entry" }, { status: 500 });
    }
}
