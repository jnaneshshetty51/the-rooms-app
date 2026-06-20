// apps/super-admin/src/app/api/partners/route.ts
// Partner Hotel CRUD API routes

import { NextRequest, NextResponse } from "next/server";
import { db } from "@the-rooms/db";

// GET /api/partners - List all partners
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");

        const where: Record<string, unknown> = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        const partners = await db.partnerHotel.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        // Stats - simplified for now
        const stats = {
            totalPartners: partners.length,
            activePartners: partners.length, // All fetched partners considered
            totalRevenue: 0,
            totalBookings: 0,
        };

        return NextResponse.json({ partners, stats });
    } catch (error) {
        console.error("Error fetching partners:", error);
        return NextResponse.json({ error: "Failed to fetch partners" }, { status: 500 });
    }
}

// POST /api/partners - Create new partner
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, phone, address, city, notes } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const partner = await db.partnerHotel.create({
            data: { name, email: email || null, phone: phone || null, address: address || null, city: city || null, notes: notes || null },
        });

        return NextResponse.json({ partner }, { status: 201 });
    } catch (error) {
        console.error("Error creating partner:", error);
        return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
    }
}
