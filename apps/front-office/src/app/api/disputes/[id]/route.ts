import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { getDispute, updateDisputeStatus } from "@the-rooms/db";

// GET /api/disputes/[id] - Get dispute by ID
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
        const dispute = await getDispute(id);

        if (!dispute) {
            return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
        }

        return NextResponse.json({ dispute });
    } catch (error) {
        console.error("Error fetching dispute:", error);
        return NextResponse.json({ error: "Failed to fetch dispute" }, { status: 500 });
    }
}

// PATCH /api/disputes/[id] - Update dispute status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json({ error: "Status is required" }, { status: 400 });
        }

        const validStatuses = ["OPEN", "UNDER_REVIEW", "PENDING_APPROVAL", "RESOLVED", "REJECTED"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const dispute = await updateDisputeStatus(id, status);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: (session.user as { id?: string }).id,
                bookingId: dispute.bookingId,
                action: "DISPUTE_STATUS_UPDATED",
                entity: "dispute",
                entityId: id,
                metadata: { status },
            },
        });

        return NextResponse.json({ dispute });
    } catch (error) {
        console.error("Error updating dispute:", error);
        return NextResponse.json({ error: "Failed to update dispute" }, { status: 500 });
    }
}
