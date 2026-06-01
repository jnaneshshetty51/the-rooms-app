import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { createPayment, getPaymentsByBooking } from "@the-rooms/db";
import prisma from "@the-rooms/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    const payments = await getPaymentsByBooking(bookingId);
    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, amount, method, transactionId } = body;

    if (!bookingId || !amount || !method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const payment = await createPayment({
      bookingId,
      amount: new Prisma.Decimal(amount),
      method,
      transactionId,
      status: "PAID",
    });

    const totalPaid = await prisma.payment.aggregate({
      where: { bookingId, status: "PAID" },
      _sum: { amount: true },
    });

    const paidAmount = totalPaid._sum.amount ?? new Prisma.Decimal(0);
    let paymentStatus: "PAID" | "PARTIAL" | "PENDING" = "PAID";
    if (paidAmount.lessThan(booking.totalAmount)) {
      paymentStatus = paidAmount.greaterThan(0) ? "PARTIAL" : "PENDING";
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        bookingId,
        action: "PAYMENT",
        entity: "payment",
        entityId: payment.id,
        metadata: { amount, method, transactionId },
      },
    });

    return NextResponse.json({ payment, paymentStatus }, { status: 201 });
  } catch (error) {
    console.error("Error recording payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
