// apps/admin/src/app/api/payments/bulk/route.ts
// POST /api/payments/bulk — bulk payment processing for multiple bookings

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, Prisma } from "@the-rooms/db";
import { z } from "zod";

const PaymentMethodEnum = z.enum(['ONLINE', 'UPI', 'CARD', 'CASH', 'BANK_TRANSFER', 'CORPORATE_INVOICE']);

const BulkPaymentItemSchema = z.object({
    bookingId: z.string().min(1),
    amount: z.number().positive(),
    method: PaymentMethodEnum,
    transactionId: z.string().optional(),
    gatewayRef: z.string().optional(),
});

const BulkPaymentSchema = z.object({
    payments: z.array(BulkPaymentItemSchema).min(1).max(50),
});

function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error("Unauthorized");
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        requireAdmin(session);

        const body = await request.json();
        const { payments } = BulkPaymentSchema.parse(body);

        const results: Array<{
            bookingId: string;
            success: boolean;
            error?: string;
            paymentId?: string;
            bookingNumber?: string;
        }> = [];

        for (const paymentData of payments) {
            try {
                // Verify booking exists
                const booking = await db.booking.findUnique({
                    where: { id: paymentData.bookingId },
                    select: { id: true, bookingNumber: true, totalAmount: true, propertyId: true },
                });

                if (!booking) {
                    results.push({
                        bookingId: paymentData.bookingId,
                        success: false,
                        error: "Booking not found",
                    });
                    continue;
                }

                // Determine payment status based on method
                const status = paymentData.method === 'CASH' || paymentData.method === 'BANK_TRANSFER' || paymentData.method === 'CORPORATE_INVOICE'
                    ? 'PENDING' as const
                    : 'PAID' as const;

                // Create payment record
                const payment = await db.payment.create({
                    data: {
                        bookingId: paymentData.bookingId,
                        amount: new Prisma.Decimal(paymentData.amount),
                        method: paymentData.method,
                        transactionId: paymentData.transactionId,
                        gatewayRef: paymentData.gatewayRef,
                        status,
                    },
                });

                // Update booking payment status
                const totalPaid = await db.payment.aggregate({
                    where: { bookingId: paymentData.bookingId, status: "PAID" },
                    _sum: { amount: true },
                });

                const paidAmount = totalPaid._sum.amount ?? new Prisma.Decimal(0);
                let paymentStatus: "PAID" | "PARTIAL" | "PENDING" | "OVERPAID" = "PENDING";

                if (paidAmount.greaterThan(booking.totalAmount)) {
                    paymentStatus = "OVERPAID";
                } else if (paidAmount.lessThan(booking.totalAmount)) {
                    paymentStatus = paidAmount.greaterThan(0) ? "PARTIAL" : "PENDING";
                } else {
                    paymentStatus = "PAID";
                }

                await db.booking.update({
                    where: { id: paymentData.bookingId },
                    data: { paymentStatus },
                });

                // Create audit log
                await db.auditLog.create({
                    data: {
                        userId: (session.user as { id: string }).id,
                        bookingId: paymentData.bookingId,
                        action: "PAYMENT",
                        entity: "payment",
                        entityId: payment.id,
                        metadata: {
                            amount: paymentData.amount,
                            method: paymentData.method,
                            transactionId: paymentData.transactionId,
                            status,
                        },
                    },
                });

                results.push({
                    bookingId: paymentData.bookingId,
                    success: true,
                    paymentId: payment.id,
                    bookingNumber: booking.bookingNumber,
                });
            } catch (error) {
                console.error(`[BULK_PAYMENT] Error processing payment for booking ${paymentData.bookingId}:`, error);
                results.push({
                    bookingId: paymentData.bookingId,
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        return NextResponse.json({
            message: `Bulk payment processing completed: ${successCount} successful, ${failureCount} failed`,
            results,
            summary: { successCount, failureCount },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
        if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("[BULK_PAYMENT]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
