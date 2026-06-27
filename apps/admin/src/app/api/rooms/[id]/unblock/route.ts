import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, notFound, badRequest, serverError } from "@the-rooms/api/response";
import { createAuditLog, getClientIp } from "@the-rooms/api/middleware";

// ─── POST /api/rooms/[id]/unblock ─────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FRONT_OFFICE") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const { id } = await params;

    const room = await db.room.findUnique({ where: { id } });
    if (!room) return notFound("Room not found");

    if (room.status !== "BLOCKED" && room.status !== "MAINTENANCE") {
      return badRequest(`Room is ${room.status}, not blocked or in maintenance`);
    }

    const updated = await db.room.update({
      where: { id },
      data: { status: "VACANT" },
    });

    await createAuditLog({
      userId: (session.user as { id: string }).id,
      action: "UPDATE",
      entity: "room",
      entityId: id,
      metadata: { roomNumber: room.roomNumber, previousStatus: room.status, newStatus: "VACANT" },
      ipAddress: getClientIp(request),
    });

    return ok({ room: updated });
  } catch (error) {
    console.error("Error unblocking room:", error);
    return serverError("Failed to unblock room", "INTERNAL_ERROR");
  }
}
