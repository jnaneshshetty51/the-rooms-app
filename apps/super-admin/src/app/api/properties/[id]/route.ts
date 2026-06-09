import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

// GET /api/properties/[id] - Get property details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        const property = await prisma.property.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        rooms: true,
                        bookings: true,
                        users: true,
                    },
                },
                rooms: {
                    take: 5,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        roomNumber: true,
                        type: true,
                        status: true,
                    },
                },
            },
        });

        if (!property) {
            return NextResponse.json({ error: "Property not found" }, { status: 404 });
        }

        return NextResponse.json({ property });
    } catch (error) {
        console.error("Error fetching property:", error);
        return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 });
    }
}

// PATCH /api/properties/[id] - Update property
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, address, city, state, country, phone, email, timezone, currency, isActive } = body;

        const property = await prisma.property.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(address !== undefined && { address }),
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
                ...(country !== undefined && { country }),
                ...(phone !== undefined && { phone }),
                ...(email !== undefined && { email }),
                ...(timezone !== undefined && { timezone }),
                ...(currency !== undefined && { currency }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        return NextResponse.json({ property });
    } catch (error) {
        console.error("Error updating property:", error);
        return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
    }
}

// DELETE /api/properties/[id] - Archive property (soft delete)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        // Prevent deletion of default property
        if (id === "default") {
            return NextResponse.json({ error: "Cannot delete default property" }, { status: 400 });
        }

        // Soft delete by setting isActive to false
        const property = await prisma.property.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ property });
    } catch (error) {
        console.error("Error deleting property:", error);
        return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
    }
}