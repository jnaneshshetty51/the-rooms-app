// apps/admin/src/app/api/exceptions/[id]/route.ts
// Exceptions API - Individual exception operations

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ExceptionStatus = "OPEN" | "RESOLVED" | "ESCALATED" | "DISMISSED";

// In-memory store reference
declare global {
    // eslint-disable-next-line no-var
    var __exceptions: Array<{
        id: string;
        status: ExceptionStatus;
        resolution: string | null;
        resolvedBy: string | null;
        resolvedAt: string | null;
        updatedAt: string;
    }> | undefined;
}

// ─── GET /api/exceptions/[id] ─────────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const exception = global.__exceptions?.find((e) => e.id === id);

        if (!exception) {
            return NextResponse.json({ error: "Exception not found" }, { status: 404 });
        }

        return NextResponse.json({ exception });
    } catch (error) {
        console.error("[EXCEPTION_GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── PATCH /api/exceptions/[id] ─────────────────────────────────────────────────

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FRONT_OFFICE") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, resolution } = body;

        const exceptionIndex = global.__exceptions?.findIndex((e) => e.id === id);

        if (!exceptionIndex || exceptionIndex === -1) {
            return NextResponse.json({ error: "Exception not found" }, { status: 404 });
        }

        const exception = global.__exceptions![exceptionIndex];
        const userName = (session.user as { name?: string }).name || "Admin";

        const updatedException = {
            ...exception,
            ...(status !== undefined && { status }),
            ...(resolution !== undefined && {
                resolution,
                resolvedBy: userName,
                resolvedAt: new Date().toISOString(),
            }),
            updatedAt: new Date().toISOString(),
        };

        global.__exceptions![exceptionIndex] = updatedException;

        return NextResponse.json({ exception: updatedException });
    } catch (error) {
        console.error("[EXCEPTION_UPDATE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── DELETE /api/exceptions/[id] ─────────────────────────────────────────────────

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const exceptionIndex = global.__exceptions?.findIndex((e) => e.id === id);

        if (!exceptionIndex || exceptionIndex === -1) {
            return NextResponse.json({ error: "Exception not found" }, { status: 404 });
        }

        global.__exceptions!.splice(exceptionIndex, 1);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[EXCEPTION_DELETE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
