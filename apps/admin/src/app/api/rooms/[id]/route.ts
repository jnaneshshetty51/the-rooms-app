// apps/admin/src/app/api/rooms/[id]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";
import { ok, badRequest, serverError, notFound } from "@the-rooms/api/response";
import { getPropertyIdFromSession } from "@the-rooms/api/middleware";
import { z } from "zod";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const UpdateRoomSchema = z.object({
  status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE", "BLOCKED"]).optional(),
  roomNumber: z.string().min(1).optional(),
  type: z.enum(["STUDIO", "PREMIUM"]).optional(),
  floor: z.number().int().positive().optional(),
  description: z.string().optional(),
  maxOccupancy: z.number().int().positive().optional(),
  basePriceSingle: z.number().positive().optional(),
  basePriceDouble: z.number().positive().optional(),
  monthlyPriceSingle: z.number().positive().nullable().optional(),
  monthlyPriceDouble: z.number().positive().nullable().optional(),
  internalNotes: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = (session?.user as { role?: string }).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const propertyId = await getPropertyIdFromSession(session);

    const { id } = await params;
    const room = await db.room.findUnique({
      where: { id },
      include: {
        amenities: { include: { amenity: true } },
        bookings: {
          where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
          include: { guest: { select: { name: true, phone: true } } },
          orderBy: { checkIn: "asc" },
        },
      },
    });

    if (!room) return notFound("Room", "NOT_FOUND");

    // Verify room belongs to user's property (SUPER_ADMIN bypasses this check)
    if (userRole !== "SUPER_ADMIN" && room.propertyId !== propertyId) {
      return notFound("Room", "NOT_FOUND");
    }

    return ok({ room });
  } catch (error) {
    console.error("[ROOM_GET]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = (session?.user as { role?: string }).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const propertyId = await getPropertyIdFromSession(session);

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        "VALIDATION_ERROR"
      );
    }

    // Verify room exists and belongs to user's property before updating
    const existingRoom = await db.room.findUnique({ where: { id } });
    if (!existingRoom) {
      return notFound("Room", "NOT_FOUND");
    }
    if (userRole !== "SUPER_ADMIN" && existingRoom.propertyId !== propertyId) {
      return notFound("Room", "NOT_FOUND");
    }

    const { status, roomNumber, type, floor, description, maxOccupancy, basePriceSingle, basePriceDouble, monthlyPriceSingle, monthlyPriceDouble, internalNotes } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      updateData.status = status;
      // When setting room to MAINTENANCE or BLOCKED, also mark cleaningStatus as DIRTY
      if (status === 'MAINTENANCE' || status === 'BLOCKED') {
        updateData.cleaningStatus = 'DIRTY';
      }
    }
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (type !== undefined) updateData.type = type;
    if (floor !== undefined) updateData.floor = floor;
    if (description !== undefined) updateData.description = description;
    if (maxOccupancy !== undefined) updateData.maxOccupancy = maxOccupancy;
    if (basePriceSingle !== undefined) updateData.basePriceSingle = new Prisma.Decimal(basePriceSingle);
    if (basePriceDouble !== undefined) updateData.basePriceDouble = new Prisma.Decimal(basePriceDouble);
    if (monthlyPriceSingle !== undefined) updateData.monthlyPriceSingle = monthlyPriceSingle ? new Prisma.Decimal(monthlyPriceSingle) : null;
    if (monthlyPriceDouble !== undefined) updateData.monthlyPriceDouble = monthlyPriceDouble ? new Prisma.Decimal(monthlyPriceDouble) : null;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

    const room = await db.room.update({
      where: { id },
      data: updateData,
      include: { amenities: { include: { amenity: true } } },
    });

    return ok({ room });
  } catch (error) {
    console.error("[ROOM_PATCH]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = (session?.user as { role?: string }).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const { id } = await params;

    // Check for active bookings
    const activeBooking = await db.booking.findFirst({
      where: { roomId: id, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    });

    if (activeBooking) {
      return badRequest("Cannot delete room with active bookings", "CONFLICT");
    }

    await db.room.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    console.error("[ROOM_DELETE]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}
