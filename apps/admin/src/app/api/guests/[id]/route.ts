import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, serverError } from "@the-rooms/api";

// GET /api/guests/[id] - Get a single guest
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

        const guest = await db.guest.findUnique({
            where: { id },
            include: {
                bookings: {
                    include: { room: { select: { roomNumber: true, type: true } } },
                    orderBy: { checkIn: 'desc' },
                },
            },
        });

        if (!guest) {
            return NextResponse.json({ error: "Guest not found" }, { status: 404 });
        }

        return ok(guest);
    } catch (error) {
        console.error("Error fetching guest:", error);
        return serverError("Failed to fetch guest");
    }
}

// PATCH /api/guests/[id] - Update a guest
export async function PATCH(
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

        const guest = await db.guest.update({
            where: { id },
            data: body,
        });

        return ok(guest);
    } catch (error) {
        console.error("Error updating guest:", error);
        return serverError("Failed to update guest");
    }
}
