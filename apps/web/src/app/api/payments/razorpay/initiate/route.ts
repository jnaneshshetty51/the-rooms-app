import { NextResponse } from "next/server";
import { db } from "@the-rooms/db";
import { getRazorpayClient } from "@the-rooms/payments/razorpay";
import { ok, badRequest, serverError } from "@the-rooms/api/response";

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) return badRequest("Missing bookingId");

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true },
    });

    if (!booking) return badRequest("Booking not found");

    const razorpay = getRazorpayClient();
    
    // Amount must be in paise
    const amountInPaise = Math.round(Number(booking.totalAmount) * 100);

    const orderOptions = {
      amount: amountInPaise,
      currency: "INR",
      receipt: booking.id,
      notes: {
        bookingNumber: booking.bookingNumber,
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    if (!order || !order.id) {
      throw new Error("Failed to create Razorpay order");
    }

    return ok({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("[Razorpay Initiate Error]:", error);
    return serverError("Failed to initiate payment");
  }
}
