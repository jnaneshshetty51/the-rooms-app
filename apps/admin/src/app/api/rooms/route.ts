// apps/admin/src/app/api/rooms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";
import { getPropertyIdFromSession } from "@the-rooms/api/middleware";
import { ok, created, badRequest, serverError } from "@the-rooms/api/response";
import { z } from "zod";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const GetRoomsSchema = z.object({
  type: z.enum(["STUDIO", "PREMIUM"]).optional(),
  status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE", "BLOCKED"]).optional(),
});

const CreateRoomSchema = z.object({
  roomNumber: z.string().min(1),
  type: z.enum(["STUDIO", "PREMIUM"]).default("STUDIO"),
  floor: z.number().int().positive().default(1),
  description: z.string().optional(),
  maxOccupancy: z.number().int().positive().default(2),
  sizeSqft: z.number().positive().optional(),
  basePriceSingle: z.number().positive().optional(),
  basePriceDouble: z.number().positive().optional(),
  monthlyPriceSingle: z.number().positive().optional(),
  monthlyPriceDouble: z.number().positive().optional(),
  internalNotes: z.string().optional(),
});

const UpdateRoomSchema = z.object({
  id: z.string().min(1),
  roomNumber: z.string().min(1).optional(),
  type: z.enum(["STUDIO", "PREMIUM"]).optional(),
  floor: z.number().int().positive().optional(),
  description: z.string().optional(),
  maxOccupancy: z.number().int().positive().optional(),
  sizeSqft: z.number().positive().optional(),
  basePriceSingle: z.number().positive().optional(),
  basePriceDouble: z.number().positive().optional(),
  monthlyPriceSingle: z.number().positive().nullable().optional(),
  monthlyPriceDouble: z.number().positive().nullable().optional(),
  internalNotes: z.string().optional(),
  status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE", "BLOCKED"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = (session?.user as { role?: string }).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validatedParams = GetRoomsSchema.parse({
      type: searchParams.get("type") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const { type, status } = validatedParams;

    // Get propertyId from session for filtering
    const propertyId = await getPropertyIdFromSession(session);

    const where: Prisma.RoomWhereInput = {};

    // SUPER_ADMIN sees all properties, others filter by propertyId
    if (userRole !== "SUPER_ADMIN") {
      if (propertyId) {
        where.propertyId = propertyId;
      } else {
        // User has no property access
        return ok([]);
      }
    }

    if (type) where.type = type;
    if (status) where.status = status;

    const [rooms, rawProfiles] = await Promise.all([
      db.room.findMany({
        where,
        include: { amenities: { include: { amenity: true } } },
        orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
      }),
      db.roomTypeProfile.findMany({
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      }),
    ]);

    const typeThumbMap: Record<string, string> = {};
    for (const p of rawProfiles) {
      if (p.images[0]) typeThumbMap[p.type] = p.images[0].url;
    }

    const roomsWithThumbnail = rooms.map((r) => ({
      ...r,
      thumbnail: typeThumbMap[r.type] ?? null,
    }));

    return ok(roomsWithThumbnail);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map(e => e.message).join(', '), "VALIDATION_ERROR");
    }
    console.error("[ROOMS_GET]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = (session?.user as { role?: string }).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    // Get propertyId from session for filtering
    const propertyId = await getPropertyIdFromSession(session);

    if (userRole !== "SUPER_ADMIN" && !propertyId) {
      return badRequest("No property access found", "FORBIDDEN");
    }

    const body = await request.json();
    const parsed = CreateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        "VALIDATION_ERROR"
      );
    }

    const { roomNumber, type, floor, description, maxOccupancy, sizeSqft, basePriceSingle, basePriceDouble, monthlyPriceSingle, monthlyPriceDouble, internalNotes } = parsed.data;

    // Check for existing room with same room number in the same property
    const existingWhere: Prisma.RoomWhereInput = { roomNumber };
    if (userRole !== "SUPER_ADMIN" && propertyId) {
      existingWhere.propertyId = propertyId;
    }
    const existing = await db.room.findFirst({ where: existingWhere });
    if (existing) {
      return badRequest("Room number already exists", "CONFLICT");
    }

    const room = await db.room.create({
      data: {
        roomNumber,
        propertyId: propertyId || "default",
        type: type ?? "STUDIO",
        floor: floor ?? 1,
        description,
        maxOccupancy: maxOccupancy ?? 2,
        sizeSqft,
        basePriceSingle: new Prisma.Decimal(basePriceSingle ?? 999),
        basePriceDouble: new Prisma.Decimal(basePriceDouble ?? 1799),
        monthlyPriceSingle: monthlyPriceSingle ? new Prisma.Decimal(monthlyPriceSingle) : undefined,
        monthlyPriceDouble: monthlyPriceDouble ? new Prisma.Decimal(monthlyPriceDouble) : undefined,
        internalNotes,
      },
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        amenities: { include: { amenity: true } },
      },
    });

    return created({ room });
  } catch (error) {
    console.error("[ROOMS_POST]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = (session?.user as { role?: string }).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    // Get propertyId from session for filtering
    const propertyId = await getPropertyIdFromSession(session);

    const body = await request.json();
    const parsed = UpdateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        "VALIDATION_ERROR"
      );
    }

    const { id, roomNumber, type, floor, description, maxOccupancy, sizeSqft, basePriceSingle, basePriceDouble, monthlyPriceSingle, monthlyPriceDouble, internalNotes, status } = parsed.data;

    // If not SUPER_ADMIN, verify the room belongs to user's property
    if (userRole !== "SUPER_ADMIN" && propertyId) {
      const roomToUpdate = await db.room.findFirst({
        where: { id, propertyId },
      });
      if (!roomToUpdate) {
        return badRequest("Room not found or access denied", "NOT_FOUND");
      }
    }

    const updateData: Prisma.RoomUpdateInput = {};
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (type !== undefined) updateData.type = type;
    if (floor !== undefined) updateData.floor = floor;
    if (description !== undefined) updateData.description = description;
    if (maxOccupancy !== undefined) updateData.maxOccupancy = maxOccupancy;
    if (sizeSqft !== undefined) updateData.sizeSqft = sizeSqft;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (status !== undefined) updateData.status = status;
    if (basePriceSingle !== undefined) updateData.basePriceSingle = new Prisma.Decimal(basePriceSingle);
    if (basePriceDouble !== undefined) updateData.basePriceDouble = new Prisma.Decimal(basePriceDouble);
    if (monthlyPriceSingle !== undefined) updateData.monthlyPriceSingle = monthlyPriceSingle ? new Prisma.Decimal(monthlyPriceSingle) : null;
    if (monthlyPriceDouble !== undefined) updateData.monthlyPriceDouble = monthlyPriceDouble ? new Prisma.Decimal(monthlyPriceDouble) : null;

    const room = await db.room.update({
      where: { id },
      data: updateData,
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        amenities: { include: { amenity: true } },
      },
    });

    return ok({ room });
  } catch (error) {
    console.error("[ROOMS_PATCH]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}
