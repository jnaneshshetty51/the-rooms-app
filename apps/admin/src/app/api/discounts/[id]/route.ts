// apps/admin/src/app/api/discounts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error("Unauthorized");
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

// GET /api/discounts/[id] - Get a single discount code
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        requireAdmin(session);

        const { id } = await params;
        const discount = await prisma.discountCode.findUnique({
            where: { id },
        });

        if (!discount) {
            return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
        }

        return NextResponse.json({ discount });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
        if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
        console.error("[DISCOUNTS_GET_ID]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/discounts/[id] - Update a discount code
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        requireAdmin(session);

        const { id } = await params;
        const body = await request.json();
        const {
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
        console.error("[DISCOUNTS_PATCH_ID]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/discounts/[id] - Deactivate a discount code
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        requireAdmin(session);

        const { id } = await params;

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
        console.error("[DISCOUNTS_DELETE_ID]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
