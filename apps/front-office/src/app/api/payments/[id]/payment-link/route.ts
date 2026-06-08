import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { getRazorpayClient } from "@the-rooms/payments/razorpay";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: bookingId } = await params;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                guest: true,
                room: true,
            },
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Calculate amount due
        const payments = await prisma.payment.aggregate({
            where: { bookingId, status: "PAID" },
            _sum: { amount: true },
        });
        const paidAmount = payments._sum.amount?.toNumber() ?? 0;
        const amountDue = booking.totalAmount.toNumber() - paidAmount;

        if (amountDue <= 0) {
            return NextResponse.json(
                { error: "No amount due. Booking is fully paid." },
                { status: 400 }
            );
        }

        const razorpay = getRazorpayClient();

        // Create Razorpay payment link
        const paymentLink = await razorpay.paymentLink.create({
            amount: Math.round(amountDue * 100), // Razorpay expects amount in paise
            currency: "INR",
            description: `Payment for Booking ${booking.bookingNumber}`,
            customer: {
                name: booking.guest.name,
                email: booking.guest.email || undefined,
                contact: booking.guest.phone,
            },
            notify: {
                sms: true,
                email: true,
            },
            reminder_enable: true,
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingId}`,
            callback_method: "get",
        });

        return NextResponse.json({
            paymentLinkId: paymentLink.id,
            shortUrl: paymentLink.short_url,
            amount: amountDue,
        });
    } catch (error) {
        console.error("Error generating payment link:", error);
        return NextResponse.json(
            { error: "Failed to generate payment link" },
            { status: 500 }
        );
    }
}
