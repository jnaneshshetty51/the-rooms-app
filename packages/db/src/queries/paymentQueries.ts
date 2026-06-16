import prisma from '../index';
import { Prisma, PaymentStatus } from '@prisma/client';

export type CreatePaymentData = {
  bookingId: string;
  amount: Prisma.Decimal;
  method: 'PAYMENT_METHOD';
  transactionId?: string;
  gatewayRef?: string;
  gatewayResponse?: object;
};

type PaymentMethodType = 'ONLINE' | 'UPI' | 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'CORPORATE_INVOICE';

/**
 * Create a payment record
 */
export async function createPayment(data: {
  bookingId: string;
  amount: Prisma.Decimal;
  method: PaymentMethodType;
  transactionId?: string;
  gatewayRef?: string;
  gatewayResponse?: object;
  status?: PaymentStatus;
}) {
  return prisma.payment.create({
    data: {
      bookingId: data.bookingId,
      amount: data.amount,
      method: data.method,
      transactionId: data.transactionId,
      gatewayRef: data.gatewayRef,
      gatewayResponse: data.gatewayResponse,
      status: data.status ?? 'PENDING',
    },
    include: { booking: { include: { guest: true, room: true } } },
  });
}

/**
 * Get all payments for a booking
 */
export async function getPaymentsByBooking(bookingId: string) {
  return prisma.payment.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Update payment status and optionally set gateway reference
 */
export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  gatewayRef?: string,
  gatewayResponse?: object
) {
  return prisma.payment.update({
    where: { id },
    data: {
      status,
      gatewayRef: gatewayRef ?? undefined,
      gatewayResponse: gatewayResponse ?? undefined,
    },
    include: { booking: { include: { guest: true, room: true } } },
  });
}

/**
 * Get payments within a date range
 */
export async function getPaymentsByDateRange(start: Date, end: Date) {
  return prisma.payment.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      status: 'PAID',
    },
    include: {
      booking: {
        include: { guest: { select: { name: true, phone: true } }, room: { select: { roomNumber: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Record a refund
 */
export async function recordRefund(paymentId: string, reason: string, refundAmount: Prisma.Decimal) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'REFUNDED',
      refundReason: reason,
      refundAmount,
      refundStatus: 'PROCESSED',
    },
  });
}

// ─── Cash vs Online Payment Tracking (Scenario 63) ──────────────────────────

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface CashCollection {
  date: Date;
  propertyId: string;
  amount: number;
  bookingNumber: string;
  guestName: string;
  collectedBy: string | null;
}

export interface OnlineCollection {
  date: Date;
  propertyId: string;
  amount: number;
  method: string;
  transactionId: string | null;
  bookingNumber: string;
  guestName: string;
}

export interface PaymentMethodTrend {
  date: Date;
  cashAmount: number;
  cashCount: number;
  onlineAmount: number;
  onlineCount: number;
  cardAmount: number;
  cardCount: number;
  upiAmount: number;
  upiCount: number;
  totalAmount: number;
}

/**
 * Get payment method breakdown for a date range
 */
export async function getPaymentMethodBreakdown(
  propertyId: string,
  startDate: Date,
  endDate: Date
): Promise<PaymentMethodBreakdown[]> {
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await prisma.payment.groupBy({
    by: ['method'],
    where: {
      booking: { propertyId },
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: 'PAID',
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalAmount = result.reduce((sum, r) => sum + Number(r._sum.amount || 0), 0);
  const totalCount = result.reduce((sum, r) => sum + r._count.id, 0);

  return result.map(r => ({
    method: r.method,
    count: r._count.id,
    totalAmount: Number(r._sum.amount || 0),
    percentage: totalCount > 0 ? (r._count.id / totalCount) * 100 : 0,
  })).sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Get cash collections for a date range
 */
export async function getCashCollections(
  propertyId: string,
  startDate: Date,
  endDate: Date
): Promise<CashCollection[]> {
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const payments = await prisma.payment.findMany({
    where: {
      booking: { propertyId },
      createdAt: { gte: startOfDay, lte: endOfDay },
      method: 'CASH',
      status: 'PAID',
    },
    select: {
      amount: true,
      createdAt: true,
      booking: {
        select: {
          bookingNumber: true,
          guest: { select: { name: true } },
        },
      },
      receipt: {
        select: {
          collectedBy: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return payments.map(p => ({
    date: p.createdAt,
    propertyId,
    amount: Number(p.amount),
    bookingNumber: p.booking.bookingNumber,
    guestName: p.booking.guest.name,
    collectedBy: p.receipt?.collectedBy?.name || null,
  }));
}

/**
 * Get online collections for a date range
 * Online = UPI, CARD, ONLINE, BANK_TRANSFER
 */
export async function getOnlineCollections(
  propertyId: string,
  startDate: Date,
  endDate: Date
): Promise<OnlineCollection[]> {
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const payments = await prisma.payment.findMany({
    where: {
      booking: { propertyId },
      createdAt: { gte: startOfDay, lte: endOfDay },
      method: { in: ['UPI', 'CARD', 'ONLINE', 'BANK_TRANSFER'] },
      status: 'PAID',
    },
    select: {
      amount: true,
      method: true,
      transactionId: true,
      createdAt: true,
      booking: {
        select: {
          bookingNumber: true,
          guest: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return payments.map(p => ({
    date: p.createdAt,
    propertyId,
    amount: Number(p.amount),
    method: p.method,
    transactionId: p.transactionId,
    bookingNumber: p.booking.bookingNumber,
    guestName: p.booking.guest.name,
  }));
}

/**
 * Get payment method trend over time
 */
export async function getPaymentMethodTrend(
  propertyId: string,
  startDate: Date,
  endDate: Date
): Promise<PaymentMethodTrend[]> {
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const payments = await prisma.payment.findMany({
    where: {
      booking: { propertyId },
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: 'PAID',
    },
    select: {
      amount: true,
      method: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const dateMap = new Map<string, PaymentMethodTrend>();

  for (const payment of payments) {
    const dateKey = payment.createdAt.toISOString().split('T')[0];
    const existing = dateMap.get(dateKey) || {
      date: new Date(dateKey),
      cashAmount: 0,
      cashCount: 0,
      onlineAmount: 0,
      onlineCount: 0,
      cardAmount: 0,
      cardCount: 0,
      upiAmount: 0,
      upiCount: 0,
      totalAmount: 0,
    };

    const amount = Number(payment.amount);
    existing.totalAmount += amount;

    if (payment.method === 'CASH') {
      existing.cashAmount += amount;
      existing.cashCount++;
    } else if (payment.method === 'CARD') {
      existing.cardAmount += amount;
      existing.cardCount++;
    } else if (payment.method === 'UPI') {
      existing.upiAmount += amount;
      existing.upiCount++;
    } else {
      // ONLINE, BANK_TRANSFER, CORPORATE_INVOICE
      existing.onlineAmount += amount;
      existing.onlineCount++;
    }

    dateMap.set(dateKey, existing);
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}
