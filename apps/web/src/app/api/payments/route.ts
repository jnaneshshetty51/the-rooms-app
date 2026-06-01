// apps/web/src/app/api/payments/route.ts
// GET /api/payments — list payments
// POST /api/payments — create payment record

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@the-rooms/auth';
import { ok, created, badRequest, unauthorized, paginated } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { Prisma } from '@prisma/client';

import { db } from '@the-rooms/db';
const CreatePaymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['ONLINE', 'UPI', 'CARD', 'CASH', 'BANK_TRANSFER', 'CORPORATE_INVOICE']),
  transactionId: z.string().optional(),
  gatewayRef: z.string().optional(),
});

const ListPaymentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  bookingId: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'REFUNDED', 'FAILED', 'PARTIAL']).optional(),
  method: z.enum(['ONLINE', 'UPI', 'CARD', 'CASH', 'BANK_TRANSFER', 'CORPORATE_INVOICE']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// GET /api/payments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const params = ListPaymentsSchema.parse(Object.fromEntries(searchParams));


    const where: Prisma.PaymentWhereInput = {};

    if (params.bookingId) {
      where.bookingId = params.bookingId;
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.method) {
      where.method = params.method;
    }
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              guest: { select: { name: true, phone: true, email: true } },
              room: { select: { roomNumber: true, type: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      db.payment.count({ where }),
    ]);

    return paginated(payments, total, params.page, params.pageSize);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[List Payments] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/payments
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }

    const userRole = session.user.role;
    if (!['SUPER_ADMIN', 'ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreatePaymentSchema.parse(body);


    // Verify booking exists
    const booking = await db.booking.findUnique({
      where: { id: data.bookingId },
      include: { guest: true },
    });

    if (!booking) {
      return badRequest('Booking not found');
    }

    // Create payment record
    const payment = await db.payment.create({
      data: {
        bookingId: data.bookingId,
        amount: new Prisma.Decimal(data.amount),
        method: data.method,
        transactionId: data.transactionId,
        gatewayRef: data.gatewayRef,
        status: data.method === 'CASH' || data.method === 'BANK_TRANSFER' ? 'PENDING' : 'PENDING',
      },
      include: {
        booking: {
          include: {
            guest: { select: { name: true, email: true } },
            room: { select: { roomNumber: true } },
          },
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'payment',
      entityId: payment.id,
      metadata: {
        bookingId: data.bookingId,
        amount: data.amount,
        method: data.method,
      },
      ipAddress: getClientIp(request),
    });

    return created(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.errors.map((e) => e.message).join(', '));
    }
    console.error('[Create Payment] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
