import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getRoomConflictById } from "@the-rooms/db";

// GET /api/room-conflicts/[id] - Get conflict by ID
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
        const conflict = await getRoomConflictById(id);

        if (!conflict) {
            return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
        }

        return NextResponse.json({ conflict });
    } catch (error) {
        console.error("Error fetching room conflict:", error);
        return NextResponse.json({ error: "Failed to fetch room conflict" }, { status: 500 });
    }
}
