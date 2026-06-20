// apps/super-admin/src/app/api/partners/[id]/route.ts
// Single Partner Hotel API routes

import { NextRequest, NextResponse } from "next/server";
import { db } from "@the-rooms/db";

// GET /api/partners/[id] - Get partner details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const partner = await db.partnerHotel.findUnique({
            where: { id },
        });

        if (!partner) {
            return NextResponse.json({ error: "Partner not found" }, { status: 404 });
        }

        // Stats - in production would come from booking/commission tables
        const stats = {
            totalBookings: 0,
            totalRevenue: 0,
            pendingCommission: 0,
            paidCommission: 0,
        };

        return NextResponse.json({ partner, ...stats });
    } catch (error) {
        console.error("Error fetching partner:", error);
        return NextResponse.json({ error: "Failed to fetch partner" }, { status: 500 });
    }
}

// PUT /api/partners/[id] - Update partner
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, email, phone, address, city, notes } = body;

        // Check if partner exists
        const existing = await db.partnerHotel.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Partner not found" }, { status: 404 });
        }

        const updateData: { name?: string; email?: string | null; phone?: string | null; address?: string | null; city?: string | null; notes?: string | null } = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email || null;
        if (phone !== undefined) updateData.phone = phone || null;
        if (address !== undefined) updateData.address = address || null;
        if (city !== undefined) updateData.city = city || null;
        if (notes !== undefined) updateData.notes = notes || null;

        const partner = await db.partnerHotel.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ partner });
    } catch (error) {
        console.error("Error updating partner:", error);
        return NextResponse.json({ error: "Failed to update partner" }, { status: 500 });
    }
}

// DELETE /api/partners/[id] - Delete partner
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const existing = await db.partnerHotel.findUnique({
            where: { id },
        });
        if (!existing) {
            return NextResponse.json({ error: "Partner not found" }, { status: 404 });
        }

        await db.partnerHotel.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Partner deleted successfully" });
    } catch (error) {
        console.error("Error deleting partner:", error);
        return NextResponse.json({ error: "Failed to delete partner" }, { status: 500 });
    }
}
