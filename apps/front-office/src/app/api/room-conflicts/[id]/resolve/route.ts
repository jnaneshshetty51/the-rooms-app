import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";
import { resolveRoomConflict } from "@the-rooms/db";

const resolveSchema = z.object({
    resolution: z.enum(["MOVE_GUEST", "UPGRADE", "DOWNGRADE", "CANCEL", "RELOCATE"]),
    notes: z.string().min(1, "Notes are required"),
    alternativeRoomId: z.string().optional(),
});

// POST /api/room-conflicts/[id]/resolve - Resolve a room conflict
export async function POST(
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
        const data = resolveSchema.parse(body);

        const conflict = await resolveRoomConflict(
            id,
            data.resolution,
            data.notes,
            (session.user as { id: string }).id,
            data.alternativeRoomId
        );

        return NextResponse.json({ conflict });
    } catch (error) {
        console.error("Error resolving room conflict:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to resolve room conflict" }, { status: 500 });
    }
}
