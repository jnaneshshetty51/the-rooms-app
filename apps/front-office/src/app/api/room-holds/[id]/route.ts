import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { releaseRoomHold } from "@the-rooms/db";

// DELETE /api/room-holds/[id] - Release a room hold
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const hold = await releaseRoomHold(id);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: (session.user as { id: string }).id,
                action: "ROOM_HOLD_RELEASED",
                entity: "roomHold",
                entityId: id,
                metadata: {
                    roomId: hold.roomId,
                },
            },
        });

        return NextResponse.json({ hold });
    } catch (error) {
        console.error("Error releasing room hold:", error);
        return NextResponse.json({ error: "Failed to release room hold" }, { status: 500 });
    }
}
