import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";
import { createRoomHold } from "@the-rooms/db";

const createHoldSchema = z.object({
    roomId: z.string().min(1, "Room ID is required"),
    checkIn: z.string().transform(val => new Date(val)),
    checkOut: z.string().transform(val => new Date(val)),
    reason: z.string().min(1, "Reason is required"),
    priority: z.number().optional().default(0),
    holdType: z.enum(["BOOKING", "PRE_ASSIGN", "WAITLIST", "HOUSEKEEPING"]).optional().default("BOOKING"),
    bookingId: z.string().optional(),
    waitlistId: z.string().optional(),
});

// POST /api/room-holds - Create a room hold
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const data = createHoldSchema.parse(body);

        const hold = await createRoomHold(
            data.roomId,
            data.checkIn,
            data.checkOut,
            data.reason,
            data.priority,
            data.holdType,
            data.bookingId,
            data.waitlistId
        );

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: (session.user as { id?: string }).id,
                action: "ROOM_HOLD_CREATED",
                entity: "roomHold",
                entityId: hold.id,
                metadata: {
                    roomId: data.roomId,
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    reason: data.reason,
                },
            },
        });

        return NextResponse.json({ hold }, { status: 201 });
    } catch (error) {
        console.error("Error creating room hold:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to create room hold" }, { status: 500 });
    }
}
