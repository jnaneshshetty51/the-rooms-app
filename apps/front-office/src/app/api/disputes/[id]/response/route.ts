import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";
import { addDisputeResponse } from "@the-rooms/db";

const responseSchema = z.object({
    response: z.string().min(1, "Response is required"),
    attachments: z.array(z.string()).optional().default([]),
});

// POST /api/disputes/[id]/response - Add response to dispute
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
        const data = responseSchema.parse(body);

        const disputeResponse = await addDisputeResponse(
            id,
            data.response,
            data.attachments,
            (session.user as { id: string }).id
        );

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: (session.user as { id: string }).id,
                bookingId: disputeResponse.dispute.bookingId,
                action: "DISPUTE_RESPONSE_ADDED",
                entity: "dispute",
                entityId: id,
                metadata: {
                    responseId: disputeResponse.id,
                    hasAttachments: data.attachments.length > 0,
                },
            },
        });

        return NextResponse.json({ response: disputeResponse }, { status: 201 });
    } catch (error) {
        console.error("Error adding dispute response:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to add response" }, { status: 500 });
    }
}
