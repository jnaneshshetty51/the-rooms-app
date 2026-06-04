import { NextResponse } from "next/server";
import { db } from "@the-rooms/db";
import { verifyPaymentSignature } from "@the-rooms/payments/razorpay";
import { ok, badRequest, serverError } from "@the-rooms/api/response";
import { updateBookingStatus } from "@the-rooms/db/queries/bookingQueries";

export async function POST(req: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !bookingId) {
      return badRequest("Missing required parameters");
    }

    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return badRequest("Invalid payment signature");
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return badRequest("Booking not found");

    // Wrap everything in a transaction to prevent race conditions
    await db.$transaction(async (tx) => {
      // Check if payment already recorded
      const existingPayment = await tx.payment.findUnique({
        where: { transactionId: razorpay_payment_id },
      });

      if (!existingPayment) {
        // Save the payment transaction
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: booking.totalAmount,
            method: "RAZORPAY",
            status: "SUCCESS",
            transactionId: razorpay_payment_id,
            gatewayResponse: {
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature,
            },
          },
        });
      }

      // Re-fetch booking status inside transaction lock
      const currentBooking = await tx.booking.findUnique({
        where: { id: booking.id },
      });

      if (currentBooking && (currentBooking.status === "PENDING" || currentBooking.status === "CONFIRMED")) {
        // Update booking status
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: "PAID",
            status: "CONFIRMED", // Directly set confirmed here instead of query helper to keep in TX
            logs: {
              create: {
                action: "UPDATE",
                entityId: booking.id,
                entityType: "Booking",
                details: "Booking confirmed by system after payment verification",
                userId: "system",
              },
            },
          },
        });
      }
    });

    return ok({ success: true });
  } catch (error) {
    console.error("[Razorpay Verify Error]:", error);
    return serverError("Verification failed");
  }
}
