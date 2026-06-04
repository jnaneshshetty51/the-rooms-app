import { NextResponse } from "next/server";
import { db } from "@the-rooms/db";
import { verifyWebhookSignature } from "@the-rooms/payments/razorpay";
import { sendPaymentSuccess } from "@the-rooms/email";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? process.env.RAZORPAY_KEY_SECRET ?? "";

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === "payment.captured") {
      const payment = payload.payload.payment.entity;
      const bookingId = payment.notes?.bookingId || payment.notes?.receipt;

      if (!bookingId) {
        return NextResponse.json({ success: true, warning: "No bookingId in notes" });
      }

      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { guest: true, room: true },
      });

      if (booking) {
        await db.$transaction(async (tx) => {
          const existingPayment = await tx.payment.findFirst({
            where: { transactionId: payment.id },
          });

          if (!existingPayment) {
            await tx.payment.create({
              data: {
                bookingId: booking.id,
                amount: booking.totalAmount,
                method: "ONLINE",
                status: "PAID",
                transactionId: payment.id,
                gatewayRef: payment.order_id,
                gatewayResponse: payment,
              },
            });

            await tx.booking.update({
              where: { id: booking.id },
              data: { paymentStatus: "PAID" },
            });
          }
        });

        const recorded = await db.payment.findFirst({ where: { transactionId: payment.id } });
        if (recorded && booking.guest?.email) {
          sendPaymentSuccess({
            to: booking.guest.email,
            guestName: booking.guest.name,
            bookingNumber: booking.bookingNumber,
            roomType: booking.room.type,
            roomNumber: booking.room.roomNumber,
            amount: Number(payment.amount) / 100,
            transactionId: payment.id,
            paymentMethod: payment.method ?? "Online",
            checkIn: booking.checkIn.toISOString().split("T")[0],
            checkOut: booking.checkOut.toISOString().split("T")[0],
          }).catch((e) => console.error("[Webhook] Email error:", e));
        }
      }
    } else if (event === "payment.failed") {
      const payment = payload.payload.payment.entity;
      const bookingId = payment.notes?.bookingId || payment.notes?.receipt;

      if (bookingId) {
        const booking = await db.booking.findUnique({ where: { id: bookingId } });

        if (booking) {
          await db.$transaction(async (tx) => {
            const existingPayment = await tx.payment.findFirst({
              where: { transactionId: payment.id },
            });

            if (!existingPayment) {
              await tx.payment.create({
                data: {
                  bookingId: booking.id,
                  amount: booking.totalAmount,
                  method: "ONLINE",
                  status: "FAILED",
                  transactionId: payment.id,
                  gatewayRef: payment.order_id,
                  gatewayResponse: payment,
                },
              });
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
