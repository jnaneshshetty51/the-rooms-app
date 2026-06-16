import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { searchLostBookings } from "@the-rooms/db";

// GET /api/booking-recovery/search - Search lost bookings
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const guestName = searchParams.get("guestName") ?? undefined;
        const phone = searchParams.get("phone") ?? undefined;
        const email = searchParams.get("email") ?? undefined;
        const bookingNumber = searchParams.get("bookingNumber") ?? undefined;
        const checkInFrom = searchParams.get("checkInFrom");
        const checkInTo = searchParams.get("checkInTo");
        const page = parseInt(searchParams.get("page") ?? "1");
        const perPage = parseInt(searchParams.get("perPage") ?? "20");

        const result = await searchLostBookings({
            guestName,
            phone,
            email,
            bookingNumber,
            checkInFrom: checkInFrom ? new Date(checkInFrom) : undefined,
            checkInTo: checkInTo ? new Date(checkInTo) : undefined,
            page,
            perPage,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error searching lost bookings:", error);
        return NextResponse.json({ error: "Failed to search lost bookings" }, { status: 500 });
    }
}
