import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getOfflineEntryConflicts } from "@the-rooms/db";

// GET /api/offline/entries/[id]/conflicts - Check conflicts for an offline entry
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const conflicts = await getOfflineEntryConflicts(id);

        return NextResponse.json(conflicts);
    } catch (error) {
        console.error("Error checking offline entry conflicts:", error);
        if (error instanceof Error && error.message === 'Offline entry not found') {
            return NextResponse.json({ error: "Offline entry not found" }, { status: 404 });
        }
        return NextResponse.json({ error: "Failed to check conflicts" }, { status: 500 });
    }
}
