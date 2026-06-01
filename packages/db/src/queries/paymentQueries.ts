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
