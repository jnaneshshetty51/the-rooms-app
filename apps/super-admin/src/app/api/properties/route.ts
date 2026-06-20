import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, created, badRequest, serverError } from "@the-rooms/api/response";
import { z } from "zod";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CreatePropertySchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().default("India"),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    timezone: z.string().default("Asia/Kolkata"),
    currency: z.string().default("INR"),
});

// GET /api/properties - List all properties
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest("Unauthorized", "UNAUTHORIZED");
        }

        // Only SUPER_ADMIN can view all properties
        if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
            return badRequest("Forbidden", "FORBIDDEN");
        }

        const properties = await db.property.findMany({
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

        return ok({ properties });
    } catch (error) {
        console.error("Error fetching properties:", error);
        return serverError("Failed to fetch properties", "INTERNAL_ERROR");
    }
}

// POST /api/properties - Create a new property
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest("Unauthorized", "UNAUTHORIZED");
        }

        // Only SUPER_ADMIN can create properties
        if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
            return badRequest("Forbidden", "FORBIDDEN");
        }

        const body = await request.json();
        const parsed = CreatePropertySchema.safeParse(body);
        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                "VALIDATION_ERROR"
            );
        }

        const { name, code, address, city, state, country, phone, email, timezone, currency } = parsed.data;

        // Check if code already exists
        const existing = await db.property.findUnique({ where: { code } });
        if (existing) {
            return badRequest("Property code already exists", "CONFLICT");
        }

        const property = await db.property.create({
            data: {
                name,
                code,
                address,
                city,
                state,
                country,
                phone,
                email,
                timezone,
                currency,
            },
        });

        return created({ property });
    } catch (error) {
        console.error("Error creating property:", error);
        return serverError("Failed to create property", "INTERNAL_ERROR");
    }
}