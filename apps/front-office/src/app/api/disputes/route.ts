import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";
import { createDispute, getDisputes } from "@the-rooms/db";

// Zod schemas for validation
const createDisputeSchema = z.object({
    bookingId: z.string().min(1, "Booking ID is required"),
    guestId: z.string().min(1, "Guest ID is required"),
    reason: z.string().min(1, "Reason is required"),
    disputedItems: z.array(z.object({
        item: z.string(),
        amount: z.number(),
        expectedAmount: z.number(),
    })),
    expectedAmount: z.number().min(0),
    disputedAmount: z.number().min(0),
    propertyId: z.string().optional(),
});

const listDisputesSchema = z.object({
    propertyId: z.string().optional(),
    status: z.string().optional(),
    startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    perPage: z.string().optional().transform(val => val ? parseInt(val) : 20),
});

// GET /api/disputes - List disputes with filters
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const params = listDisputesSchema.parse({
            propertyId: searchParams.get("propertyId") ?? undefined,
            status: searchParams.get("status") ?? undefined,
            startDate: searchParams.get("startDate") ?? undefined,
            endDate: searchParams.get("endDate") ?? undefined,
            page: searchParams.get("page") ?? undefined,
            perPage: searchParams.get("perPage") ?? undefined,
        });

        const result = await getDisputes(params);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching disputes:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to fetch disputes" }, { status: 500 });
    }
}

// POST /api/disputes - Create a new dispute
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const data = createDisputeSchema.parse(body);

        const dispute = await createDispute(
            data.bookingId,
            data.guestId,
            data.reason,
            data.disputedItems,
            data.expectedAmount,
            data.disputedAmount,
            data.propertyId
        );

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: (session.user as { id?: string }).id,
                bookingId: data.bookingId,
                action: "DISPUTE_CREATED",
                entity: "dispute",
                entityId: dispute.id,
                metadata: {
                    disputeId: dispute.id,
                    reason: data.reason,
                    disputedAmount: data.disputedAmount,
                },
            },
        });

        return NextResponse.json({ dispute }, { status: 201 });
    } catch (error) {
        console.error("Error creating dispute:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to create dispute" }, { status: 500 });
    }
}
