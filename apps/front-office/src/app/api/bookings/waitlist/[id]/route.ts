import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma, { Prisma } from "@the-rooms/db";
import { z } from "zod";

// ─── Get/Update/Delete Waitlist Entry ─────────────────────────────────────────

/**
 * GET /api/bookings/waitlist/[id]
 * Get a single waitlist entry
 */
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

        const entry = await prisma.waitlist.findUnique({
            where: { id },
        });

        if (!entry) {
            return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
        }

        return NextResponse.json(entry);
    } catch (error) {
        console.error("[WAITLIST_GET_ERROR]", error);
        return NextResponse.json({ error: "Failed to fetch waitlist entry" }, { status: 500 });
    }
}

/**
 * PATCH /api/bookings/waitlist/[id]
 * Update a waitlist entry (e.g., extend expiry, change priority)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only FRONT_OFFICE, ADMIN, and SUPER_ADMIN can update waitlist
        if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();

        const updateData: any = {};

        if (body.priority !== undefined) {
            updateData.priority = body.priority;
        }

        if (body.expiresAt !== undefined) {
            updateData.expiresAt = new Date(body.expiresAt);
        }

        if (body.status !== undefined) {
            updateData.status = body.status;

            if (body.status === 'NOTIFIED') {
                updateData.notifiedAt = new Date();
            }
        }

        if (body.resolvedReason !== undefined) {
            updateData.resolvedReason = body.resolvedReason;
            updateData.resolvedAt = new Date();
        }

        const entry = await prisma.waitlist.update({
            where: { id },
            data: updateData,
        });

        // Create audit log
        const userId = (session.user as { id: string }).id;
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'WAITLIST_UPDATED',
                entity: 'waitlist',
                entityId: id,
                metadata: {
                    updates: updateData,
                },
            },
        });

        return NextResponse.json(entry);
    } catch (error) {
        console.error("[WAITLIST_UPDATE_ERROR]", error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
            }
        }

        return NextResponse.json({ error: "Failed to update waitlist entry" }, { status: 500 });
    }
}

/**
 * DELETE /api/bookings/waitlist/[id]
 * Remove a guest from the waitlist
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only FRONT_OFFICE, ADMIN, and SUPER_ADMIN can delete from waitlist
        if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const reason = searchParams.get("reason") ?? "Cancelled by staff";

        const userId = (session.user as { id: string }).id;

        const entry = await prisma.waitlist.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                resolvedAt: new Date(),
                resolvedReason: reason,
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'WAITLIST_REMOVED',
                entity: 'waitlist',
                entityId: id,
                metadata: {
                    waitlistNumber: entry.waitlistNumber,
                    reason,
                },
            },
        });

        return NextResponse.json({ success: true, entry });
    } catch (error) {
        console.error("[WAITLIST_DELETE_ERROR]", error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
            }
        }

        return NextResponse.json({ error: "Failed to remove from waitlist" }, { status: 500 });
    }
}