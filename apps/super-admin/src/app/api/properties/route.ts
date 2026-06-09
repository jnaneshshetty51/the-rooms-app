import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

// GET /api/properties - List all properties
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SUPER_ADMIN can view all properties
        if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const properties = await prisma.property.findMany({
            include: {
                _count: {
                    select: {
                        rooms: true,
                        bookings: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ properties });
    } catch (error) {
        console.error("Error fetching properties:", error);
        return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
    }
}

// POST /api/properties - Create a new property
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SUPER_ADMIN can create properties
        if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { name, code, address, city, state, country, phone, email, timezone, currency } = body;

        if (!name || !code) {
            return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
        }

        // Check if code already exists
        const existing = await prisma.property.findUnique({ where: { code } });
        if (existing) {
            return NextResponse.json({ error: "Property code already exists" }, { status: 400 });
        }

        const property = await prisma.property.create({
            data: {
                name,
                code,
                address,
                city,
                state,
                country: country || "India",
                phone,
                email,
                timezone: timezone || "Asia/Kolkata",
                currency: currency || "INR",
            },
        });

        return NextResponse.json({ property }, { status: 201 });
    } catch (error) {
        console.error("Error creating property:", error);
        return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
    }
}