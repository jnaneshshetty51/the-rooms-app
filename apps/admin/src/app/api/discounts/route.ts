// apps/admin/src/app/api/discounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";
import { RoomType } from "@prisma/client";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

// GET /api/discounts - List all discount codes
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const discounts = await prisma.discountCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ discounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[DISCOUNTS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/discounts - Create a new discount code
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const body = await request.json();
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
    } = body;

    if (!code || !name || !type || value === undefined) {
      return NextResponse.json(
        { error: "code, name, type, and value are required" },
        { status: 400 }
      );
    }

    if (type !== "PERCENTAGE" && type !== "FIXED_AMOUNT") {
      return NextResponse.json(
        { error: "type must be PERCENTAGE or FIXED_AMOUNT" },
        { status: 400 }
      );
    }

    if (type === "PERCENTAGE" && (parseFloat(value) <= 0 || parseFloat(value) > 100)) {
      return NextResponse.json(
        { error: "Percentage value must be between 0 and 100" },
        { status: 400 }
      );
    }

    if (validFrom && validUntil && new Date(validFrom) > new Date(validUntil)) {
      return NextResponse.json(
        { error: "Valid From date must be before Valid Until date" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Discount code already exists" },
        { status: 409 }
      );
    }

    const discount = await prisma.discountCode.create({
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
        applicableRoomTypes: applicableRoomTypes ?? [],
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ discount }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[DISCOUNTS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/discounts - Update a discount code
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const body = await request.json();
    const {
      id,
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
    } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) {
      if (type !== "PERCENTAGE" && type !== "FIXED_AMOUNT") {
        return NextResponse.json(
          { error: "type must be PERCENTAGE or FIXED_AMOUNT" },
          { status: 400 }
        );
      }
      updateData.type = type;
    }
    if (value !== undefined) {
      if (type === "PERCENTAGE" && (parseFloat(value) <= 0 || parseFloat(value) > 100)) {
        return NextResponse.json(
          { error: "Percentage value must be between 0 and 100" },
          { status: 400 }
        );
      }
      updateData.value = new Prisma.Decimal(value);
    }
    if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : null;
    if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
    if (maxUses !== undefined) updateData.maxUses = maxUses;
    if (maxUsesPerUser !== undefined) updateData.maxUsesPerUser = maxUsesPerUser;
    if (minNights !== undefined) updateData.minNights = minNights;
    if (maxNights !== undefined) updateData.maxNights = maxNights;
    if (minBookingValue !== undefined) updateData.minBookingValue = minBookingValue ? new Prisma.Decimal(minBookingValue) : null;
    if (maxBookingValue !== undefined) updateData.maxBookingValue = maxBookingValue ? new Prisma.Decimal(maxBookingValue) : null;
    if (applicableRoomTypes !== undefined) updateData.applicableRoomTypes = applicableRoomTypes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const discount = await prisma.discountCode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ discount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Discount code already exists" }, { status: 409 });
    }
    console.error("[DISCOUNTS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/discounts - Deactivate a discount code
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Soft delete by deactivating
    await prisma.discountCode.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[DISCOUNTS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
