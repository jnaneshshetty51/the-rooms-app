import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";
import { mergeDuplicateBookings } from "@the-rooms/db";

const mergeSchema = z.object({
    bookingId1: z.string().min(1, "First booking ID is required"),
    bookingId2: z.string().min(1, "Second booking ID is required"),
    primaryBookingId: z.string().min(1, "Primary booking ID is required"),
});

// POST /api/booking-recovery/merge - Merge duplicate bookings
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const data = mergeSchema.parse(body);

        const booking = await mergeDuplicateBookings(
            data.bookingId1,
            data.bookingId2,
            data.primaryBookingId,
            (session.user as { id?: string }).id
        );

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: (session.user as { id?: string }).id,
                bookingId: data.primaryBookingId,
                action: "BOOKINGS_MERGED",
                entity: "booking",
                entityId: data.primaryBookingId,
                metadata: {
                    mergedFrom: data.bookingId1 === data.primaryBookingId ? data.bookingId2 : data.bookingId1,
                },
            },
        });

        return NextResponse.json({ booking });
    } catch (error) {
        console.error("Error merging bookings:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to merge bookings" }, { status: 500 });
    }
}
