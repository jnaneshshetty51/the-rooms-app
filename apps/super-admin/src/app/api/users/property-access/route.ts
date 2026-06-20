// apps/super-admin/src/app/api/users/property-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, getAllUserPropertyAccess, getUserPropertyAccess, createUserPropertyAccess } from "@the-rooms/db";
import { z } from "zod";

const createUserPropertyAccessSchema = z.object({
    userId: z.string().min(1),
    propertyId: z.string().min(1),
    role: z.enum(["VIEWER", "STAFF", "MANAGER", "ADMIN"]).optional(),
});

const listQuerySchema = z.object({
    userId: z.string().optional(),
    propertyId: z.string().optional(),
    role: z.enum(["VIEWER", "STAFF", "MANAGER", "ADMIN"]).optional(),
});

// ─── Guest Lookup ─────────────────────────────────────────────────────────────
// GET /api/users/property-access - List user property access records
// POST /api/users/property-access - Create a new user property access record

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || undefined;
        const propertyId = searchParams.get("propertyId") || undefined;
        const role = searchParams.get("role") as "VIEWER" | "STAFF" | "MANAGER" | "ADMIN" | undefined;

        const parsed = listQuerySchema.safeParse({ userId, propertyId, role });
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const records = await getAllUserPropertyAccess({
            where: {
                userId: parsed.data.userId,
                propertyId: parsed.data.propertyId,
                role: parsed.data.role,
            },
        });

        return NextResponse.json({ data: records });
    } catch (error) {
        console.error("[USER_PROPERTY_ACCESS_GET]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const parsed = createUserPropertyAccessSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { userId, propertyId, role } = parsed.data;

        // Verify user exists
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify property exists
        const property = await db.property.findUnique({ where: { id: propertyId } });
        if (!property) {
            return NextResponse.json({ error: "Property not found" }, { status: 404 });
        }

        // Check if access already exists
        const existing = await getUserPropertyAccess(userId, propertyId);
        if (existing) {
            return NextResponse.json(
                { error: "User already has access to this property. Use PATCH to update the role." },
                { status: 409 }
            );
        }

        const record = await createUserPropertyAccess({
            userId,
            propertyId,
            role: role || "VIEWER",
        });

        // Audit log
        const currentUserId = (session.user as { id?: string }).id ?? "";
        await db.auditLog.create({
            data: {
                userId: currentUserId,
                action: "USER_PROPERTY_ACCESS_CREATED",
                entity: "UserPropertyAccess",
                entityId: record.id,
                metadata: { userId, propertyId, role: role || "VIEWER" },
            },
        });

        return NextResponse.json({ data: record }, { status: 201 });
    } catch (error) {
        console.error("[USER_PROPERTY_ACCESS_POST]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
