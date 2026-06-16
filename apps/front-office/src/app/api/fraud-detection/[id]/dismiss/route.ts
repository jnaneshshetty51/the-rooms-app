import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";
import { dismissFraudFlag } from "@the-rooms/db";

const dismissSchema = z.object({
    reason: z.string().min(1, "Reason is required"),
});

// POST /api/fraud-detection/[id]/dismiss - Dismiss as false positive
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
        const data = dismissSchema.parse(body);

        const flag = await dismissFraudFlag(id, data.reason);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: (session.user as { id: string }).id,
                bookingId: flag.bookingId,
                action: "FRAUD_FLAG_DISMISSED",
                entity: "fraudFlag",
                entityId: id,
                metadata: {
                    reason: data.reason,
                },
            },
        });

        return NextResponse.json({ flag });
    } catch (error) {
        console.error("Error dismissing fraud flag:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to dismiss fraud flag" }, { status: 500 });
    }
}
