// apps/admin/src/app/api/discounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const discounts = await prisma.discount.findMany({
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const body = await request.json();
    const { name, code, type, discountPercent, minDays, maxDays, validFrom, validTo, maxUses, isActive } = body;

    if (!name || !code || !type || discountPercent === undefined) {
      return NextResponse.json({ error: "name, code, type, and discountPercent are required" }, { status: 400 });
    }
    
    if (parseFloat(discountPercent) <= 0 || parseFloat(discountPercent) > 100) {
      return NextResponse.json({ error: "Discount percent must be between 0 and 100" }, { status: 400 });
    }

    if (validFrom && validTo && new Date(validFrom) > new Date(validTo)) {
      return NextResponse.json({ error: "Valid From date must be before Valid To date" }, { status: 400 });
    }

    const existing = await prisma.discount.findUnique({ where: { code } });
    if (existing) return NextResponse.json({ error: "Discount code already exists" }, { status: 409 });

    const discount = await prisma.discount.create({
      data: {
        name,
        code,
        type,
        discountPercent: new Prisma.Decimal(discountPercent),
        minDays: minDays ?? 1,
        maxDays,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        maxUses,
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const body = await request.json();
    const { id, name, code, type, discountPercent, minDays, maxDays, validFrom, validTo, maxUses, isActive } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (type !== undefined) updateData.type = type;
    if (discountPercent !== undefined) {
      if (parseFloat(discountPercent) <= 0 || parseFloat(discountPercent) > 100) {
        return NextResponse.json({ error: "Discount percent must be between 0 and 100" }, { status: 400 });
      }
      updateData.discountPercent = new Prisma.Decimal(discountPercent);
    }
    if (minDays !== undefined) updateData.minDays = minDays;
    if (maxDays !== undefined) updateData.maxDays = maxDays;
    if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : null;
    if (validTo !== undefined) updateData.validTo = validTo ? new Date(validTo) : null;
    
    // Cross-field validation for PATCH requires fetching existing or trusting the frontend mostly.
    // We'll trust the updateData object to be consistent if both are sent.
    if (updateData.validFrom && updateData.validTo && updateData.validFrom > updateData.validTo) {
      return NextResponse.json({ error: "Valid From date must be before Valid To date" }, { status: 400 });
    }

    if (maxUses !== undefined) updateData.maxUses = maxUses;
    if (isActive !== undefined) updateData.isActive = isActive;

    const discount = await prisma.discount.update({
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.discount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[DISCOUNTS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
