import { NextResponse, NextRequest } from "next/server";
import { db } from "@the-rooms/db";
import { verifyWebhookSignature, getRazorpayClient } from "@the-rooms/payments/razorpay";
import { sendPaymentSuccess } from "@the-rooms/email";
import { getClientIp } from "@the-rooms/api/middleware";

async function resolveBooking(payment: any) {
  // 1. Try resolving by notes.bookingId or notes.receipt
  let bookingId = payment.notes?.bookingId || payment.notes?.receipt;
  if (bookingId) {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, room: true },
    });
    if (booking) return booking;
  }

  // 2. Try resolving by notes.bookingNumber
  const bookingNumber = payment.notes?.bookingNumber;
  if (bookingNumber) {
    const booking = await db.booking.findUnique({
      where: { bookingNumber },
      include: { guest: true, room: true },
    });
    if (booking) return booking;
  }

  // 3. Fallback: Try resolving by fetching the Razorpay order using order_id
  if (payment.order_id) {
    try {
      const razorpay = getRazorpayClient();
      const order = await razorpay.orders.fetch(payment.order_id);
      if (order && order.receipt) {
        const booking = await db.booking.findUnique({
          where: { id: order.receipt },
          include: { guest: true, room: true },
        });
        if (booking) return booking;
      }
    } catch (err) {
      console.error("[Webhook] Failed to fetch order from Razorpay:", err);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
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
      const booking = await resolveBooking(payment);

      if (!booking) {
        return NextResponse.json({ success: true, warning: "Could not resolve booking" });
      }

      await db.$transaction(async (tx) => {
        const existingPayment = await tx.payment.findFirst({
          where: { transactionId: payment.id },
        });

        if (!existingPayment) {
          const newPayment = await tx.payment.create({
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

          await tx.auditLog.create({
            data: {
              bookingId: booking.id,
              action: "PAYMENT",
              entity: "payment",
              entityId: newPayment.id,
              metadata: {
                amount: booking.totalAmount.toNumber(),
                method: "ONLINE",
                transactionId: payment.id,
                event: "payment.captured",
                gateway: "RAZORPAY",
              },
              ipAddress: getClientIp(req),
            },
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
    } else if (event === "payment.failed") {
      const payment = payload.payload.payment.entity;
      const booking = await resolveBooking(payment);

      if (booking) {
        await db.$transaction(async (tx) => {
          const existingPayment = await tx.payment.findFirst({
            where: { transactionId: payment.id },
          });

          if (!existingPayment) {
            const newPayment = await tx.payment.create({
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

            await tx.auditLog.create({
              data: {
                bookingId: booking.id,
                action: "PAYMENT",
                entity: "payment",
                entityId: newPayment.id,
                metadata: {
                  amount: booking.totalAmount.toNumber(),
                  method: "ONLINE",
                  transactionId: payment.id,
                  event: "payment.failed",
                  gateway: "RAZORPAY",
                  error: payment.error_description ?? "Payment failed",
                },
                ipAddress: getClientIp(req),
              },
            });
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
