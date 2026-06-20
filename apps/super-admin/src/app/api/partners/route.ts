// apps/super-admin/src/app/api/partners/route.ts
// Partner Hotel CRUD API routes

import { NextRequest, NextResponse } from "next/server";
import { db } from "@the-rooms/db";

// GET /api/partners - List all partners
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");

        // Build where clause - use any to handle dynamic schema
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
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
        const {
            name,
            email,
            phone,
            website,
            address,
            city,
            state,
            country,
            commissionRate,
            status = "ACTIVE",
        } = body;

        // Validation
        if (!name || commissionRate === undefined) {
            return NextResponse.json({ error: "Name and commission rate are required" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createData: any = {
            name,
            commissionRate,
            status,
        };

        if (email) createData.email = email;
        if (phone) createData.phone = phone;
        if (address) createData.address = address;
        if (city) createData.city = city;
        if (state) createData.state = state;
        if (country) createData.country = country;

        const partner = await db.partnerHotel.create({
            data: createData,
        });

        return NextResponse.json({ partner }, { status: 201 });
    } catch (error) {
        console.error("Error creating partner:", error);
        return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
    }
}
