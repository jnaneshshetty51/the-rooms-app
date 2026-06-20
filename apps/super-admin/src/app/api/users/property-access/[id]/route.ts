// apps/super-admin/src/app/api/users/property-access/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, getUserPropertyAccessById, updateUserPropertyAccess, deleteUserPropertyAccess } from "@the-rooms/db";
import { z } from "zod";

const updateUserPropertyAccessSchema = z.object({
    role: z.enum(["VIEWER", "STAFF", "MANAGER", "ADMIN"]).optional(),
});

// ─── Single User Property Access Operations ─────────────────────────────────
// GET /api/users/property-access/[id] - Get a single user property access record
// PATCH /api/users/property-access/[id] - Update a user property access record
// DELETE /api/users/property-access/[id] - Delete a user property access record

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

        const record = await getUserPropertyAccessById(id);
        if (!record) {
            return NextResponse.json({ error: "User property access not found" }, { status: 404 });
        }

        return NextResponse.json({ data: record });
    } catch (error) {
        console.error("[USER_PROPERTY_ACCESS_GET_BY_ID]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
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

        const body = await request.json();
        const parsed = updateUserPropertyAccessSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        // Check if record exists
        const existing = await getUserPropertyAccessById(id);
        if (!existing) {
            return NextResponse.json({ error: "User property access not found" }, { status: 404 });
        }

        const record = await updateUserPropertyAccess(id, parsed.data);

        // Audit log
        const currentUserId = (session.user as { id?: string }).id ?? "";
        await db.auditLog.create({
            data: {
                userId: currentUserId,
                action: "USER_PROPERTY_ACCESS_UPDATED",
                entity: "UserPropertyAccess",
                entityId: id,
                metadata: parsed.data,
            },
        });

        return NextResponse.json({ data: record });
    } catch (error) {
        console.error("[USER_PROPERTY_ACCESS_PATCH]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
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

        // Check if record exists
        const existing = await getUserPropertyAccessById(id);
        if (!existing) {
            return NextResponse.json({ error: "User property access not found" }, { status: 404 });
        }

        await deleteUserPropertyAccess(id);

        // Audit log
        const currentUserId = (session.user as { id?: string }).id ?? "";
        await db.auditLog.create({
            data: {
                userId: currentUserId,
                action: "USER_PROPERTY_ACCESS_DELETED",
                entity: "UserPropertyAccess",
                entityId: id,
                metadata: {
                    userId: existing.userId,
                    propertyId: existing.propertyId,
                    deletedRole: existing.role,
                },
            },
        });

        return NextResponse.json({ data: { deleted: true } });
    } catch (error) {
        console.error("[USER_PROPERTY_ACCESS_DELETE]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
