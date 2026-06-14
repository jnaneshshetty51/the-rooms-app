import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getBookingById, getFolioSummary } from "@the-rooms/db";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify booking exists
        const booking = await getBookingById(id);
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const folio = await getFolioSummary(id);

        return NextResponse.json(folio);
    } catch (error) {
        console.error("Error fetching folio:", error);
        return NextResponse.json({ error: "Failed to fetch folio" }, { status: 500 });
    }
}
