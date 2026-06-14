import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, notFound, serverError } from "@the-rooms/api";
import { db } from "@the-rooms/db";
import { markRoomAsDirty } from "@the-rooms/db";

// ─── Mark Room as Dirty ────────────────────────────────────────────────────────

/**
 * POST /api/rooms/[id]/mark-dirty
 * Manually mark a room as dirty (e.g., for deep cleaning or maintenance发现了问题)
 * Sets cleaningStatus to DIRTY
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const role = (session.user as any).role;

        // Only HOUSEKEEPING, ADMIN, SUPER_ADMIN, FRONT_OFFICE can mark rooms as dirty
        if (
            role !== "HOUSEKEEPING" &&
            role !== "SUPER_ADMIN" &&
            role !== "ADMIN" &&
            role !== "FRONT_OFFICE"
        ) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const { notes } = body;

        // Verify room exists
        const existingRoom = await db.room.findUnique({ where: { id } });
        if (!existingRoom) {
            return notFound("Room");
        }

        // Mark room as dirty
        const updatedRoom = await markRoomAsDirty(id, notes);

        // Create audit log
        await db.auditLog.create({
            data: {
                userId,
                action: "ROOM_MARKED_DIRTY",
                entity: "room",
                entityId: id,
                metadata: {
                    roomNumber: existingRoom.roomNumber,
                    previousStatus: existingRoom.cleaningStatus,
                    notes,
                },
            },
        });

        return ok(updatedRoom);
    } catch (error) {
        console.error("Error marking room as dirty:", error);
        return serverError("Failed to mark room as dirty");
    }
}
