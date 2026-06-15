import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, serverError } from "@the-rooms/api";

// GET /api/guests/[id]/bookings - Get bookings for a guest
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

        const bookings = await db.booking.findMany({
            where: { guestId: id },
            include: {
                room: {
                    select: { roomNumber: true, type: true },
                },
            },
            orderBy: { checkIn: 'desc' },
        });

        return ok({ bookings });
    } catch (error) {
        console.error("Error fetching guest bookings:", error);
        return serverError("Failed to fetch guest bookings");
    }
}
