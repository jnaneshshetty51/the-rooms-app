// apps/guest-portal/src/app/api/guest-checkin/route.ts
// Guest Online Check-in API

import { auth } from "@the-rooms/auth";
import { NextRequest, NextResponse } from "next/server";
import { db, getGuestByPhone, getUpcomingBookingForGuest, getGuestDocuments } from "@the-rooms/db";
import { ok, badRequest, serverError, notFound } from "@the-rooms/api";
import { z } from "zod";

// ─── Schema ─────────────────────────────────────────────────────────────────

const checkInSchema = z.object({
    bookingId: z.string(),
    actualCheckInTime: z.string().datetime({ message: 'Invalid check-in time' }).optional(),
    documentId: z.string().optional(),
    acknowledgeTerms: z.boolean().refine(v => v === true, 'You must acknowledge the terms'),
});

// ─── Auth Helper ─────────────────────────────────────────────────────────────

async function getGuestIdFromSession(session: Awaited<ReturnType<typeof auth>>) {
    if (!session?.user?.email) return null;
    const guest = await getGuestByPhone(session.user.email ?? "");
    return guest?.id;
}

// ─── GET /api/guest-checkin ──────────────────────────────────────────────────
// Get check-in status and booking info for guest

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const guestId = await getGuestIdFromSession(session);
        if (!guestId) {
            return NextResponse.json({ error: "Guest not found" }, { status: 404 });
        }

        // Get upcoming booking
        const booking = await getUpcomingBookingForGuest(guestId);

        if (!booking) {
            return NextResponse.json({ booking: null, documents: [], message: "No upcoming booking found" });
        }

        // Get guest documents
        const documents = await getGuestDocuments(guestId);

        // Check if already checked in
        if (booking.status === 'CHECKED_IN') {
            return NextResponse.json({
                booking,
                documents,
                alreadyCheckedIn: true,
                message: "Already checked in",
            });
        }

        // Check if booking is confirmed
        if (booking.status !== 'CONFIRMED') {
            return NextResponse.json({
                booking,
                documents,
                canCheckIn: false,
                message: `Cannot check in - booking status is ${booking.status}`,
            });
        }

        return NextResponse.json({
            booking,
            documents,
            canCheckIn: true,
        });
    } catch (error) {
        console.error("Error fetching check-in info:", error);
        return serverError("Failed to fetch check-in information");
    }
}

// ─── POST /api/guest-checkin ─────────────────────────────────────────────────
// Process guest online check-in

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const guestId = await getGuestIdFromSession(session);
        if (!guestId) {
            return NextResponse.json({ error: "Guest not found" }, { status: 404 });
        }

        const body = await request.json();
        const parsed = checkInSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(
                parsed.error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const { bookingId, actualCheckInTime, documentId } = parsed.data;

        // Get the booking
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: { room: true, guest: true },
        });

        if (!booking) {
            return notFound('Booking', 'BOOKING_NOT_FOUND');
        }

        // Verify booking belongs to this guest
        if (booking.guestId !== guestId) {
            return badRequest('Booking does not belong to this guest', 'UNAUTHORIZED');
        }

        // Check if already checked in
        if (booking.status === 'CHECKED_IN') {
            return badRequest('Booking is already checked in', 'ALREADY_CHECKED_IN');
        }

        // Check if booking is confirmed
        if (booking.status !== 'CONFIRMED') {
            return badRequest(
                `Cannot check in - booking status is ${booking.status}`,
                'INVALID_STATUS'
            );
        }

        // Verify check-in date is today or in the past
        const checkInDate = new Date(booking.checkIn);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkInDate > today) {
            return badRequest(
                'Check-in is not available yet. You can only check in on your check-in date.',
                'CHECKIN_NOT_AVAILABLE'
            );
        }

        // Use provided time or current time
        const checkInTime = actualCheckInTime
            ? new Date(actualCheckInTime)
            : new Date();

        // Update booking status
        const updatedBooking = await db.booking.update({
            where: { id: bookingId },
            data: {
                status: 'CHECKED_IN',
                checkedInAt: checkInTime,
                checkedInMethod: 'ONLINE_SELF_CHECKIN',
            },
        });

        // Update room status to OCCUPIED
        if (booking.roomId) {
            await db.room.update({
                where: { id: booking.roomId },
                data: { status: 'OCCUPIED' },
            });
        }

        // Link document to booking if provided
        if (documentId) {
            await db.guestDocument.update({
                where: { id: documentId },
                data: { bookingId },
            });
        }

        return ok({
            booking: updatedBooking,
            message: 'Check-in successful',
            roomNumber: booking.room?.roomNumber,
        });
    } catch (error) {
        console.error("Error processing guest check-in:", error);
        return serverError("Failed to process check-in");
    }
}