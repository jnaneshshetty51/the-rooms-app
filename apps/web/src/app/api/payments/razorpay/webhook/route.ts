import { NextResponse } from "next/server";
import { db } from "@the-rooms/db";
import { verifyWebhookSignature } from "@the-rooms/payments/razorpay";
import { updateBookingStatus } from "@the-rooms/db/queries/bookingQueries";
import { sendPaymentSuccess, sendPaymentFailed } from "@the-rooms/email";

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
    
    // Process only payment events for now
    if (event === "payment.captured") {
      const payment = payload.payload.payment.entity;
      const orderId = payment.order_id;
      const bookingId = payment.notes?.bookingId || payment.notes?.receipt;

      if (!bookingId) {
        return NextResponse.json({ success: true, warning: "No bookingId in notes" });
      }

      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { guest: true },
      });

      if (booking) {
        await db.$transaction(async (tx) => {
          // Only insert if not already recorded
          const existingPayment = await tx.payment.findUnique({
            where: { transactionId: payment.id },
          });

          if (!existingPayment) {
            await tx.payment.create({
              data: {
                bookingId: booking.id,
                amount: booking.totalAmount,
                method: "RAZORPAY",
                status: "SUCCESS",
                transactionId: payment.id,
                gatewayResponse: payment,
              },
            });

            // Re-fetch booking status inside transaction lock
            const currentBooking = await tx.booking.findUnique({
              where: { id: booking.id },
            });

            if (currentBooking && (currentBooking.status === "PENDING" || currentBooking.status === "CONFIRMED")) {
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
                      details: "Booking confirmed by system after payment webhook",
                      userId: "system",
                    },
                  },
                },
              });
            }
          }
        });

        // Outside transaction, send email if needed
        const existingPaymentCheck = await db.payment.findUnique({
          where: { transactionId: payment.id },
        });
        
        if (existingPaymentCheck && booking.guest?.email) {
            sendPaymentSuccess({
              to: booking.guest.email,
              guestName: booking.guest.name,
              bookingNumber: booking.bookingNumber,
              transactionId: payment.id,
              totalAmount: Number(payment.amount) / 100, // convert paise to INR
              paymentMethod: payment.method ?? "Online",
              hotelAddress: process.env.HOTEL_ADDRESS ?? "The Rooms, 103/2, Uniworld, Neeladri Road, Behind Karnataka Bank, Electronic City Phase 1, Bangalore, Karnataka 560100",
              hotelPhone: process.env.HOTEL_PHONE ?? "+91 73490 47799",
              hotelEmail: process.env.EMAIL_FROM ?? "hello@therooms.in",
            }).catch((e) => console.error("[Webhook] Email error:", e));
          }
        }
      }
    } else if (event === "payment.failed") {
      const payment = payload.payload.payment.entity;
      const bookingId = payment.notes?.bookingId || payment.notes?.receipt;

      if (bookingId) {
        const booking = await db.booking.findUnique({
          where: { id: bookingId },
          include: { guest: true },
        });

        if (booking) {
          await db.$transaction(async (tx) => {
            const existingPayment = await tx.payment.findUnique({
              where: { transactionId: payment.id },
            });
            
            if (!existingPayment) {
              await tx.payment.create({
                data: {
                  bookingId: booking.id,
                  amount: booking.totalAmount,
                  method: "RAZORPAY",
                  status: "FAILED",
                  transactionId: payment.id,
                  errorMessage: payment.error_description || "Payment failed",
                  gatewayResponse: payment,
                },
              });
            }
          });

          if (booking.guest?.email) {
            sendPaymentFailed({
              to: booking.guest.email,
              guestName: booking.guest.name,
              bookingNumber: booking.bookingNumber,
              retryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/book/payment?retry=${booking.id}`,
            }).catch((e) => console.error("[Webhook] Email error:", e));
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
