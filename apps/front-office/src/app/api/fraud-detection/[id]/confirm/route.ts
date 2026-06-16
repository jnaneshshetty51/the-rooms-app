import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";
import { confirmFraud } from "@the-rooms/db";

const confirmSchema = z.object({
    actionTaken: z.string().min(1, "Action taken is required"),
});

// POST /api/fraud-detection/[id]/confirm - Confirm fraud
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
        const data = confirmSchema.parse(body);

        const flag = await confirmFraud(id, data.actionTaken);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: (session.user as { id?: string }).id,
                bookingId: flag.bookingId,
                action: "FRAUD_CONFIRMED",
                entity: "fraudFlag",
                entityId: id,
                metadata: {
                    actionTaken: data.actionTaken,
                    guestBlacklisted: true,
                },
            },
        });

        return NextResponse.json({ flag });
    } catch (error) {
        console.error("Error confirming fraud:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to confirm fraud" }, { status: 500 });
    }
}
