import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { z } from "zod";

const createRequestSchema = z.object({
    type: z.enum(["EARLY_CHECKIN", "LATE_CHECKOUT", "DATE_CHANGE"]),
    requestedCheckIn: z.string().optional(),
    requestedCheckOut: z.string().optional(),
    reason: z.string().optional(),
});

// POST /api/bookings/[id]/stay-modification - Create a new stay modification request
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: bookingId } = await params;

        // Get the booking
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: {
                guest: true,
                room: true,
                property: true,
            },
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Verify the guest owns this booking
        const guestByEmail = await db.guest.findFirst({
            where: { email: session.user.email ?? "" },
        });

        if (!guestByEmail || booking.guestId !== guestByEmail.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Check if booking is in valid status (CONFIRMED or CHECKED_IN)
        if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_IN") {
            return NextResponse.json(
                { error: `Cannot request stay modification. Current booking status: ${booking.status}` },
                { status: 400 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const parseResult = createRequestSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: `Invalid request: ${parseResult.error.errors.map(e => e.message).join(", ")}` },
                { status: 400 }
            );
        }

        const { type, requestedCheckIn, requestedCheckOut, reason } = parseResult.data;

        // Check if there's already a pending request
        const existingRequest = await db.stayModificationRequest.findFirst({
            where: {
                bookingId,
                status: "PENDING",
            },
        });

        if (existingRequest) {
            return NextResponse.json(
                { error: "A stay modification request is already pending for this booking" },
                { status: 400 }
            );
        }

        // For DATE_CHANGE, validate the new dates
        if (type === "DATE_CHANGE") {
            if (!requestedCheckOut) {
                return NextResponse.json(
                    { error: "New check-out date is required for date change requests" },
                    { status: 400 }
                );
            }

            const newCheckOutDate = new Date(requestedCheckOut);
            const currentCheckOutDate = new Date(booking.checkOut);

            if (newCheckOutDate <= currentCheckOutDate) {
                return NextResponse.json(
                    { error: "New check-out date must be after the current check-out date" },
                    { status: 400 }
                );
            }
        }

        // Create the stay modification request
        const stayRequest = await db.stayModificationRequest.create({
            data: {
                bookingId,
                type,
                status: "PENDING",
                originalCheckIn: booking.checkIn,
                originalCheckOut: booking.checkOut,
                requestedCheckIn: requestedCheckIn ? new Date(requestedCheckIn) : null,
                requestedCheckOut: requestedCheckOut ? new Date(requestedCheckOut) : null,
                reason,
            },
        });

        return NextResponse.json({
            success: true,
            request: {
                id: stayRequest.id,
                type: stayRequest.type,
                status: stayRequest.status,
                requestedCheckIn: stayRequest.requestedCheckIn,
                requestedCheckOut: stayRequest.requestedCheckOut,
                reason: stayRequest.reason,
            },
            message: "Stay modification request submitted. Our front office team will review and confirm shortly.",
        });
    } catch (error) {
        console.error("Error creating stay modification request:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// GET /api/bookings/[id]/stay-modification - Get stay modification request status
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: bookingId } = await params;

        // Get the booking
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: { guest: true },
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Verify the guest owns this booking
        const guestByEmail = await db.guest.findFirst({
            where: { email: session.user.email ?? "" },
        });

        if (!guestByEmail || booking.guestId !== guestByEmail.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Get pending request
        const pendingRequest = await db.stayModificationRequest.findFirst({
            where: {
                bookingId,
                status: "PENDING",
            },
        });

        if (!pendingRequest) {
            return NextResponse.json({ hasPendingRequest: false });
        }

        return NextResponse.json({
            hasPendingRequest: true,
            request: {
                id: pendingRequest.id,
                type: pendingRequest.type,
                status: pendingRequest.status,
                originalCheckIn: pendingRequest.originalCheckIn,
                originalCheckOut: pendingRequest.originalCheckOut,
                requestedCheckIn: pendingRequest.requestedCheckIn,
                requestedCheckOut: pendingRequest.requestedCheckOut,
                reason: pendingRequest.reason,
                createdAt: pendingRequest.createdAt,
            },
        });
    } catch (error) {
        console.error("Error getting stay modification request:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}