import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, notFound, serverError } from "@the-rooms/api";
import { db } from "@the-rooms/db";
import {
  getRoomById,
  markRoomAsCleaned,
  markRoomAsDirty,
  markRoomAsCleaning,
  updateRoomCleaningNotes,
  reportRoomMaintenance,
} from "@the-rooms/db";

// ─── Get Room Details ─────────────────────────────────────────────────────────

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

    const room = await getRoomById(id);
    if (!room) {
      return notFound("Room");
    }

    return ok(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    return serverError("Failed to fetch room");
  }
}

// ─── Update Room Housekeeping Status ──────────────────────────────────────────

export async function PATCH(
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

    // Only HOUSEKEEPING, ADMIN, SUPER_ADMIN, FRONT_OFFICE can update
    if (
      role !== "HOUSEKEEPING" &&
      role !== "SUPER_ADMIN" &&
      role !== "ADMIN" &&
      role !== "FRONT_OFFICE"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { cleaningStatus, status, notes, maintenanceNotes } = body;

    // Verify room exists
    const existingRoom = await db.room.findUnique({ where: { id } });
    if (!existingRoom) {
      return notFound("Room");
    }

    let updatedRoom;

    // Handle cleaning status update
    if (cleaningStatus) {
      if (cleaningStatus === "CLEAN") {
        // Mark room as cleaned - sets lastCleanedAt and cleanedById
        updatedRoom = await markRoomAsCleaned(id, userId, notes);
      } else if (cleaningStatus === "DIRTY") {
        // Mark room as dirty manually
        updatedRoom = await markRoomAsDirty(id, notes);
      } else if (cleaningStatus === "CLEANING") {
        // Mark room as cleaning in progress
        updatedRoom = await markRoomAsCleaning(id, userId);
      } else {
        return badRequest("Invalid cleaning status");
      }
    }

    // Handle maintenance status update
    if (status === "MAINTENANCE") {
      updatedRoom = await reportRoomMaintenance(id, maintenanceNotes);
    }

    // Handle notes update only (no status change)
    if (!updatedRoom && notes) {
      updatedRoom = await updateRoomCleaningNotes(id, notes);
    }

    // If no specific update happened but we have a room, use existing
    if (!updatedRoom) {
      updatedRoom = await getRoomById(id);
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        entity: "room",
        entityId: id,
        metadata: {
          cleaningStatus,
          status,
          notes,
          maintenanceNotes,
        },
      },
    });

    return ok(updatedRoom);
  } catch (error) {
    console.error("Error updating room:", error);
    return serverError("Failed to update room");
  }
}
