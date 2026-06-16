import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";
import { resolveDispute } from "@the-rooms/db";

const resolveSchema = z.object({
    resolution: z.string().min(1, "Resolution is required"),
    adjustmentAmount: z.number().optional(),
    resolutionType: z.enum(["FULL_REFUND", "PARTIAL_REFUND", "ADJUSTMENT", "NO_ADJUSTMENT", "WAIVED"]).optional(),
});

// POST /api/disputes/[id]/resolve - Resolve a dispute
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
        const data = resolveSchema.parse(body);

        const dispute = await resolveDispute(
            id,
            data.resolution,
            data.adjustmentAmount,
            data.resolutionType
        );

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: (session.user as { id?: string }).id,
                bookingId: dispute.bookingId,
                action: "DISPUTE_RESOLVED",
                entity: "dispute",
                entityId: id,
                metadata: {
                    resolution: data.resolution,
                    adjustmentAmount: data.adjustmentAmount,
                    resolutionType: data.resolutionType,
                },
            },
        });

        return NextResponse.json({ dispute });
    } catch (error) {
        console.error("Error resolving dispute:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to resolve dispute" }, { status: 500 });
    }
}
