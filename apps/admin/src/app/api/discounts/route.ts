// apps/admin/src/app/api/discounts/route.ts
import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";
import type { RoomType } from "@the-rooms/db";
import { ok, created, badRequest, serverError, conflict } from "@the-rooms/api/response";
import { z } from "zod";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CreateDiscountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  value: z.number().positive(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxUses: z.number().int().nonnegative().optional(),
  maxUsesPerUser: z.number().int().nonnegative().optional(),
  minNights: z.number().int().nonnegative().default(1),
  maxNights: z.number().int().nonnegative().optional(),
  minBookingValue: z.number().nonnegative().optional(),
  maxBookingValue: z.number().nonnegative().optional(),
  applicableRoomTypes: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

const UpdateDiscountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
  value: z.number().positive().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().nonnegative().nullable().optional(),
  maxUsesPerUser: z.number().int().nonnegative().nullable().optional(),
  minNights: z.number().int().nonnegative().optional(),
  maxNights: z.number().int().nonnegative().nullable().optional(),
  minBookingValue: z.number().nonnegative().nullable().optional(),
  maxBookingValue: z.number().nonnegative().nullable().optional(),
  applicableRoomTypes: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/discounts - List all discount codes
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const discounts = await db.discountCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    return ok({ discounts });
  } catch (error) {
    console.error("[DISCOUNTS_GET]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

// POST /api/discounts - Create a new discount code
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const body = await request.json();
    const parsed = CreateDiscountSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        "VALIDATION_ERROR"
      );
    }

    const {
      code,
      name,
      description,
      type,
      value,
      validFrom,
      validUntil,
      maxUses,
      maxUsesPerUser,
      minNights,
      maxNights,
      minBookingValue,
      maxBookingValue,
      applicableRoomTypes,
      isActive,
    } = parsed.data;

    if (type === "PERCENTAGE" && (value <= 0 || value > 100)) {
      return badRequest("Percentage value must be between 0 and 100", "VALIDATION_ERROR");
    }

    if (validFrom && validUntil && new Date(validFrom) > new Date(validUntil)) {
      return badRequest("Valid From date must be before Valid Until date", "VALIDATION_ERROR");
    }

    // Check if code already exists
    const existing = await db.discountCode.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (existing) {
      return conflict("Discount code already exists");
    }

    const discount = await db.discountCode.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        type,
        value: new Prisma.Decimal(value),
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        maxUses: maxUses ?? null,
        maxUsesPerUser: maxUsesPerUser ?? null,
        minNights: minNights ?? 1,
        maxNights: maxNights ?? null,
        minBookingValue: minBookingValue ? new Prisma.Decimal(minBookingValue) : null,
        maxBookingValue: maxBookingValue ? new Prisma.Decimal(maxBookingValue) : null,
        applicableRoomTypes: (applicableRoomTypes ?? []) as RoomType[],
        isActive: isActive ?? true,
      },
    });

    return created({ discount });
  } catch (error) {
    console.error("[DISCOUNTS_POST]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

// PATCH /api/discounts - Update a discount code
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const body = await request.json();
    const parsed = UpdateDiscountSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        "VALIDATION_ERROR"
      );
    }

    const { id, ...updateData } = parsed.data;

    if (updateData.type === "PERCENTAGE" && updateData.value !== undefined && (updateData.value <= 0 || updateData.value > 100)) {
      return badRequest("Percentage value must be between 0 and 100", "VALIDATION_ERROR");
    }

    if (updateData.validFrom !== undefined && updateData.validUntil !== undefined && updateData.validFrom !== null && updateData.validUntil !== null) {
      if (new Date(updateData.validFrom) > new Date(updateData.validUntil)) {
        return badRequest("Valid From date must be before Valid Until date", "VALIDATION_ERROR");
      }
    }

    const discount = await db.discountCode.update({
      where: { id },
      data: {
        ...updateData,
        value: updateData.value !== undefined ? new Prisma.Decimal(updateData.value) : undefined,
        minBookingValue: updateData.minBookingValue !== undefined ? (updateData.minBookingValue ? new Prisma.Decimal(updateData.minBookingValue) : null) : undefined,
        maxBookingValue: updateData.maxBookingValue !== undefined ? (updateData.maxBookingValue ? new Prisma.Decimal(updateData.maxBookingValue) : null) : undefined,
        applicableRoomTypes: updateData.applicableRoomTypes as RoomType[] | undefined,
      },
    });

    return ok({ discount });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return conflict("Discount code already exists");
    }
    console.error("[DISCOUNTS_PATCH]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

// DELETE /api/discounts - Deactivate a discount code
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("id is required", "VALIDATION_ERROR");

    // Soft delete by deactivating
    await db.discountCode.update({
      where: { id },
      data: { isActive: false },
    });

    return ok({ success: true });
  } catch (error) {
    console.error("[DISCOUNTS_DELETE]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}
