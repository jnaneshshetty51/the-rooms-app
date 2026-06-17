// apps/super-admin/src/app/api/users/[id]/properties/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { z } from "zod";

const assignPropertySchema = z.object({
    propertyId: z.string().min(1),
    role: z.enum(["VIEWER", "STAFF", "MANAGER", "ADMIN"]).optional(),
});

// ─── User Properties ─────────────────────────────────────────────────────────
// GET /api/users/[id]/properties - Get all properties assigned to a user
// POST /api/users/[id]/properties - Assign a property to a user

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        // Verify user exists
        const user = await db.user.findUnique({ where: { id } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const properties = await db.getPropertiesByUser(id);

        return NextResponse.json({ data: properties });
    } catch (error) {
        console.error("[USER_PROPERTIES_GET]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        // Verify user exists
        const user = await db.user.findUnique({ where: { id } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await request.json();
        const parsed = assignPropertySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { propertyId, role } = parsed.data;

        // Verify property exists
        const property = await db.property.findUnique({ where: { id: propertyId } });
        if (!property) {
            return NextResponse.json({ error: "Property not found" }, { status: 404 });
        }

        // Upsert the access
        const record = await db.upsertUserPropertyAccess({
            userId: id,
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
                metadata: { userId: id, propertyId, role: role || "VIEWER" },
            },
        });

        return NextResponse.json({ data: record }, { status: 201 });
    } catch (error) {
        console.error("[USER_PROPERTIES_POST]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
