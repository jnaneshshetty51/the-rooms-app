import { db } from "@the-rooms/db";
import { verifyPaymentSignature } from "@the-rooms/payments/razorpay";
import { ok, badRequest, serverError } from "@the-rooms/api/response";

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

    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return badRequest("Booking not found");

    await db.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findFirst({
        where: { transactionId: razorpay_payment_id },
      });

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: booking.totalAmount,
            method: "ONLINE",
            status: "PAID",
            transactionId: razorpay_payment_id,
            gatewayRef: razorpay_order_id,
            gatewayResponse: { razorpay_order_id, razorpay_payment_id, razorpay_signature },
          },
        });
      }

      const currentBooking = await tx.booking.findUnique({ where: { id: booking.id } });
      if (currentBooking && currentBooking.status === "CONFIRMED") {
        await tx.booking.update({
          where: { id: booking.id },
          data: { paymentStatus: "PAID" },
        });
      }
    });

    return ok({ success: true });
  } catch (error) {
    console.error("[Razorpay Verify Error]:", error);
    return serverError("Verification failed");
  }
}
