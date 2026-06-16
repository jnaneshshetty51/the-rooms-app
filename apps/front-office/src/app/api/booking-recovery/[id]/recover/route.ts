import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";
import { recoverBooking } from "@the-rooms/db";

const recoverSchema = z.object({
    recoveryAction: z.enum(["REACTIVATED", "REFUNDED", "REBOOKED", "MERGED", "CANCELLED"]),
    linkedBookingId: z.string().optional(),
});

// POST /api/booking-recovery/[id]/recover - Recover a lost booking
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
        const userId = (session.user as { id: string }).id;
        const body = await request.json();
        const data = recoverSchema.parse(body);

        const lostBooking = await recoverBooking(
            id,
            data.recoveryAction,
            userId,
            data.linkedBookingId
        );

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId,
                bookingId: lostBooking.bookingId,
                action: "LOST_BOOKING_RECOVERED",
                entity: "lostBooking",
                entityId: id,
                metadata: {
                    recoveryAction: data.recoveryAction,
                    linkedBookingId: data.linkedBookingId,
                },
            },
        });

        return NextResponse.json({ lostBooking });
    } catch (error) {
        console.error("Error recovering lost booking:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to recover lost booking" }, { status: 500 });
    }
}
