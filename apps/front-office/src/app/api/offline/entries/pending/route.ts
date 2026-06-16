import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getPendingOfflineEntries } from "@the-rooms/db";

// GET /api/offline/entries/pending - Get pending offline entries
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") ?? 'default';
        const page = parseInt(searchParams.get("page") ?? "1");
        const perPage = parseInt(searchParams.get("perPage") ?? "20");

        const result = await getPendingOfflineEntries(propertyId, page, perPage);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching pending offline entries:", error);
        return NextResponse.json({ error: "Failed to fetch pending entries" }, { status: 500 });
    }
}
