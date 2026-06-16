import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { detectRoomConflicts, getRoomConflicts } from "@the-rooms/db";

// GET /api/room-conflicts - Detect or list room conflicts
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get("date");
        const roomId = searchParams.get("roomId") ?? undefined;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const page = parseInt(searchParams.get("page") ?? "1");
        const perPage = parseInt(searchParams.get("perPage") ?? "20");

        // If date is provided, detect conflicts for that date
        if (date) {
            const conflicts = await detectRoomConflicts(new Date(date));
            return NextResponse.json({ conflicts, total: conflicts.length });
        }

        // Otherwise, list conflicts with filters
        const result = await getRoomConflicts({
            roomId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page,
            perPage,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching room conflicts:", error);
        return NextResponse.json({ error: "Failed to fetch room conflicts" }, { status: 500 });
    }
}
