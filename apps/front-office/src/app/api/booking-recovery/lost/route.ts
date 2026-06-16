import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getLostBookings } from "@the-rooms/db";

// GET /api/booking-recovery/lost - List lost bookings
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") ?? 'default';
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const page = parseInt(searchParams.get("page") ?? "1");
        const perPage = parseInt(searchParams.get("perPage") ?? "20");

        const result = await getLostBookings(
            propertyId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
            page,
            perPage
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching lost bookings:", error);
        return NextResponse.json({ error: "Failed to fetch lost bookings" }, { status: 500 });
    }
}
