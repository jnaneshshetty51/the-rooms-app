import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";
import { updateFraudFlagStatus } from "@the-rooms/db";

const investigateSchema = z.object({
    status: z.enum(["PENDING_REVIEW", "UNDER_INVESTIGATION", "CONFIRMED_FRAUD", "FALSE_POSITIVE", "ACTION_TAKEN"]),
    notes: z.string().optional(),
});

// POST /api/fraud-detection/[id]/investigate - Update investigation status
export async function POST(
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
        const data = investigateSchema.parse(body);

        const flag = await updateFraudFlagStatus(id, data.status, data.notes);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: (session.user as { id?: string }).id,
                bookingId: flag.bookingId,
                action: "FRAUD_FLAG_INVESTIGATED",
                entity: "fraudFlag",
                entityId: id,
                metadata: {
                    status: data.status,
                    notes: data.notes,
                },
            },
        });

        return NextResponse.json({ flag });
    } catch (error) {
        console.error("Error updating fraud flag:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to update fraud flag" }, { status: 500 });
    }
}
