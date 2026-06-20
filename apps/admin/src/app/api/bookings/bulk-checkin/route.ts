// apps/admin/src/app/api/bookings/bulk-checkin/route.ts
// POST /api/bookings/bulk-checkin — bulk check-in for multiple bookings

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { z } from "zod";

const BulkCheckInSchema = z.object({
    bookingIds: z.array(z.string().min(1)).min(1).max(50),
});

function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error("Unauthorized");
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        requireAdmin(session);

        const body = await request.json();
        const { bookingIds } = BulkCheckInSchema.parse(body);

        const results: Array<{ bookingId: string; success: boolean; error?: string; bookingNumber?: string }> = [];

        for (const bookingId of bookingIds) {
            try {
                // Find the booking
                const booking = await db.booking.findUnique({
                    where: { id: bookingId },
                    select: { id: true, status: true, roomId: true, bookingNumber: true },
                });

                if (!booking) {
                    results.push({
                        bookingId,
                        success: false,
                        error: "Booking not found",
                    });
                    continue;
                }

                // Validate booking can be checked in
                if (booking.status !== "CONFIRMED") {
                    results.push({
                        bookingId,
                        success: false,
                        error: `Cannot check in: booking status is ${booking.status}, expected CONFIRMED`,
                        bookingNumber: booking.bookingNumber,
                    });
                    continue;
                }

                // Update booking status to CHECKED_IN
                const updatedBooking = await db.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: "CHECKED_IN",
                        checkInTime: new Date(),
                    },
                });

                // Update room status to OCCUPIED
                await db.room.update({
                    where: { id: booking.roomId },
                    data: { status: "OCCUPIED" },
                });

                // Create audit log
                await db.auditLog.create({
                    data: {
                        userId: (session.user as { id: string }).id,
                        bookingId,
                        action: "CHECK_IN",
                        entity: "booking",
                        entityId: bookingId,
                        metadata: {
                            bookingNumber: booking.bookingNumber,
                            previousStatus: booking.status,
                            newStatus: "CHECKED_IN",
                        },
                    },
                });

                results.push({
                    bookingId,
                    success: true,
                    bookingNumber: booking.bookingNumber,
                });
            } catch (error) {
                console.error(`[BULK_CHECK_IN] Error processing booking ${bookingId}:`, error);
                results.push({
                    bookingId,
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        return NextResponse.json({
            message: `Bulk check-in completed: ${successCount} successful, ${failureCount} failed`,
            results,
            summary: { successCount, failureCount },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
        if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("[BULK_CHECK_IN]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
