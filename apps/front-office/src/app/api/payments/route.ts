import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { createPayment, getPaymentsByBooking, Prisma } from "@the-rooms/db";
import { db } from "@the-rooms/db";
import { getPropertyIdFromSession } from "@the-rooms/api/middleware";
import { ok, created, badRequest, serverError } from "@the-rooms/api/response";
import { z } from "zod";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CreatePaymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive(),
  method: z.string().min(1),
  transactionId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return badRequest("Unauthorized", "UNAUTHORIZED");
    }

    // Get propertyId from session for filtering
    const propertyId = await getPropertyIdFromSession(session);
    const userRole = session?.user?.role;

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (bookingId) {
      const payments = await getPaymentsByBooking(bookingId);
      return ok(payments);
    } else {
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const where: { createdAt?: { gte?: Date; lte?: Date }; propertyId?: string } = {};

      // SUPER_ADMIN sees all properties, others filter by propertyId
      if (userRole !== "SUPER_ADMIN") {
        if (propertyId) {
          where.propertyId = propertyId;
        } else {
          // User has no property access
          return ok([]);
        }
      }

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }
      const payments = await db.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 500,
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              propertyId: true,
              guest: {
                select: { name: true, phone: true },
              },
              room: {
                select: { roomNumber: true },
              },
            },
          },
        },
      });
      return ok(payments);
    }
  } catch (error) {
    console.error("Error fetching payments:", error);
    return serverError("Failed to fetch payments", "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return badRequest("Unauthorized", "UNAUTHORIZED");
    }

    // Get propertyId from session for filtering
    const propertyId = await getPropertyIdFromSession(session);
    const userRole = session?.user?.role;

    const body = await request.json();
    const parsed = CreatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        "VALIDATION_ERROR"
      );
    }

    const { bookingId, amount, method, transactionId } = parsed.data;

    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return badRequest("Booking not found", "NOT_FOUND");
    }

    // Verify booking belongs to user's property (for non-SUPER_ADMIN)
    if (userRole !== "SUPER_ADMIN" && propertyId && booking.propertyId !== propertyId) {
      return badRequest("Access denied to this booking", "FORBIDDEN");
    }

    const payment = await createPayment({
      bookingId,
      amount: new Prisma.Decimal(amount),
      method,
      transactionId,
      status: "PAID",
    });

    const totalPaid = await db.payment.aggregate({
      where: { bookingId, status: "PAID" },
      _sum: { amount: true },
    });

    const paidAmount = totalPaid._sum.amount ?? new Prisma.Decimal(0);
    let paymentStatus: "PAID" | "PARTIAL" | "PENDING" | "OVERPAID" = "PAID";
    if (paidAmount.greaterThan(booking.totalAmount)) {
      paymentStatus = "OVERPAID";
    } else if (paidAmount.lessThan(booking.totalAmount)) {
      paymentStatus = paidAmount.greaterThan(0) ? "PARTIAL" : "PENDING";
    }

    await db.booking.update({
      where: { id: bookingId },
      data: { paymentStatus },
    });

    await db.auditLog.create({
      data: {
        userId: (session.user as { id: string }).id,
        bookingId,
        action: "PAYMENT",
        entity: "payment",
        entityId: payment.id,
        metadata: { amount, method, transactionId },
      },
    });

    return created({ payment, paymentStatus });
  } catch (error) {
    console.error("Error recording payment:", error);
    return serverError("Failed to record payment", "INTERNAL_ERROR");
  }
}
