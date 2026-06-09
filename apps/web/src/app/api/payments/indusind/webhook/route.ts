import { NextResponse, NextRequest } from "next/server";
import { db, generateInvoice } from "@the-rooms/db";
import { verifyIndusIndWebhookSignature, fromPaise } from "@the-rooms/payments/indusind";
import { sendPaymentSuccess } from "@the-rooms/email";
import { getClientIp } from "@the-rooms/api/middleware";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-indusind-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const secret = process.env.INDUSIND_WEBHOOK_SECRET ?? "";

    if (!verifyIndusIndWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    
    // Simulate event format for IndusInd
    const event = payload.event;
    const paymentData = payload.data; 

    if (event === "payment.success") {
      const transactionId = paymentData.transaction_id;
      const orderId = paymentData.order_id;
      const bookingId = paymentData.notes?.bookingId;

      if (!bookingId) {
        return NextResponse.json({ success: true, warning: "Missing bookingId in payload" });
      }

      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { guest: true, room: true },
      });

      if (!booking) {
        return NextResponse.json({ success: true, warning: "Could not resolve booking" });
      }

      let newPaymentId: string | null = null;
      let shouldGenerateInvoice = false;

      const expectedAmount = booking.totalAmount.toNumber();
      // IndusInd amount is in paise
      const paidAmount = fromPaise(Number(paymentData.amount));
      const paymentStatus = paidAmount >= expectedAmount ? "PAID" : "PARTIAL";

      try {
        await db.$transaction(async (tx) => {
          const newPayment = await tx.payment.upsert({
            where: { transactionId },
            update: {}, // Idempotent
            create: {
              bookingId: booking.id,
              amount: paidAmount,
              method: "ONLINE",
              status: paymentStatus,
              transactionId: transactionId,
              gatewayRef: orderId,
              gatewayResponse: paymentData,
            },
          });

          // Check if we just created it
          if (newPayment.createdAt.getTime() > Date.now() - 10000) {
            newPaymentId = newPayment.id;
            shouldGenerateInvoice = paymentStatus === "PAID";

            await tx.booking.update({
              where: { id: booking.id },
              data: { paymentStatus },
            });

            await tx.auditLog.create({
              data: {
                bookingId: booking.id,
                action: "PAYMENT",
                entity: "payment",
                entityId: newPayment.id,
                metadata: {
                  amount: paidAmount,
                  method: "ONLINE",
                  transactionId: transactionId,
                  event: "payment.success",
                  gateway: "INDUSIND",
                },
                ipAddress: getClientIp(req),
              },
            });
          }
        });

        if (newPaymentId && shouldGenerateInvoice) {
          try {
            await generateInvoice(newPaymentId, booking.id);
          } catch (invErr) {
            console.error("[IndusInd Webhook] Failed to generate invoice:", invErr);
          }
        }

        const recorded = await db.payment.findUnique({ where: { transactionId } });
        if (recorded && booking.guest?.email) {
          sendPaymentSuccess({
            to: booking.guest.email,
            guestName: booking.guest.name,
            bookingNumber: booking.bookingNumber,
            roomType: booking.room.type,
            roomNumber: booking.room.roomNumber,
            amount: paidAmount,
            transactionId: transactionId,
            paymentMethod: "Online",
            checkIn: booking.checkIn.toISOString().split("T")[0],
            checkOut: booking.checkOut.toISOString().split("T")[0],
          }).catch((e) => console.error("[IndusInd Webhook] Email error:", e));
        }
      } catch (err: any) {
        if (err.code === "P2002") {
          console.log("[IndusInd Webhook] Duplicate webhook ignored for transactionId:", transactionId);
        } else {
          throw err;
        }
      }
    } else if (event === "payment.failed") {
      // Basic failed handling
      const transactionId = paymentData.transaction_id;
      const orderId = paymentData.order_id;
      const bookingId = paymentData.notes?.bookingId;

      if (bookingId) {
        const booking = await db.booking.findUnique({ where: { id: bookingId } });
        if (booking) {
          try {
            await db.$transaction(async (tx) => {
              const newPayment = await tx.payment.upsert({
                where: { transactionId },
                update: {}, 
                create: {
                  bookingId: booking.id,
                  amount: booking.totalAmount,
                  method: "ONLINE",
                  status: "FAILED",
                  transactionId: transactionId,
                  gatewayRef: orderId,
                  gatewayResponse: paymentData,
                },
              });

              if (newPayment.createdAt.getTime() > Date.now() - 10000) {
                await tx.auditLog.create({
                  data: {
                    bookingId: booking.id,
                    action: "PAYMENT",
                    entity: "payment",
                    entityId: newPayment.id,
                    metadata: {
                      amount: booking.totalAmount.toNumber(),
                      method: "ONLINE",
                      transactionId: transactionId,
                      event: "payment.failed",
                      gateway: "INDUSIND",
                      error: paymentData.error_message ?? "Payment failed",
                    },
                    ipAddress: getClientIp(req),
                  },
                });
              }
            });
          } catch (err: any) {
             if (err.code !== "P2002") throw err;
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[IndusInd Webhook Error]:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
