import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Look up guest by email from session
        const guest = await db.guest.findFirst({
            where: { email: session.user.email ?? "" },
        });

        if (!guest) {
            return NextResponse.json({ payments: [], refunds: [] });
        }

        // Get all bookings for this guest
        const bookings = await db.booking.findMany({
            where: { guestId: guest.id },
            select: { id: true },
        });

        const bookingIds = bookings.map((b) => b.id);

        if (bookingIds.length === 0) {
            return NextResponse.json({ payments: [], refunds: [] });
        }

        // Get all payments for these bookings
        const payments = await db.payment.findMany({
            where: {
                bookingId: { in: bookingIds },
            },
            include: {
                booking: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        room: {
                            select: {
                                roomNumber: true,
                                type: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Separate refunds from payments
        const regularPayments = payments.filter((p) => p.type !== "REFUND");
        const refunds = payments.filter((p) => p.type === "REFUND");

        return NextResponse.json({
            payments: regularPayments.map((p) => ({
                id: p.id,
                amount: p.amount.toNumber(),
                method: p.method,
                status: p.status,
                transactionId: p.transactionId,
                createdAt: p.createdAt,
                booking: p.booking
                    ? {
                        id: p.booking.id,
                        bookingNumber: p.booking.bookingNumber,
                        room: p.booking.room,
                    }
                    : null,
            })),
            refunds: refunds.map((r) => ({
                id: r.id,
                amount: r.amount.toNumber(),
                method: r.method,
                status: r.status,
                transactionId: r.transactionId,
                createdAt: r.createdAt,
                booking: r.booking
                    ? {
                        id: r.booking.id,
                        bookingNumber: r.booking.bookingNumber,
                        room: r.booking.room,
                    }
                    : null,
            })),
        });
    } catch (error) {
        console.error("Error fetching payment history:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}