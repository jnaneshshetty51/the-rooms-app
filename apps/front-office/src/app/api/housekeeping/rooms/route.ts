import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, serverError } from "@the-rooms/api";
import { getRoomsNeedingCleaning, getRoomsByCleaningStatus } from "@the-rooms/db";

// ─── Housekeeping Rooms List ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (
      role !== "HOUSEKEEPING" &&
      role !== "SUPER_ADMIN" &&
      role !== "ADMIN" &&
      role !== "FRONT_OFFICE"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // "DIRTY" | "CLEANING" | "ALL"

    let rooms;
    if (filter === "DIRTY" || filter === "CLEANING") {
      rooms = await getRoomsByCleaningStatus(filter);
    } else {
      // Default: show rooms needing cleaning (DIRTY and CLEANING)
      rooms = await getRoomsNeedingCleaning();
    }

    return ok(rooms);
  } catch (error) {
    console.error("Error fetching housekeeping rooms:", error);
    return serverError("Failed to fetch rooms");
  }
}
