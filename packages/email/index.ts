// packages/email/index.ts
// Resend email client + all send functions

import React from 'react';
import { Resend } from 'resend';
import {
  BookingConfirmationEmail,
  CheckInReminderEmail,
  CheckOutReminderEmail,
  PaymentSuccessEmail,
  InvoiceEmail,
  ExtendStayRequestEmail,
  GuestComplaintEmail,
} from './templates';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM ?? 'hello@therooms.in';
const FROM_NAME = 'The Rooms';

export const emailConfig = {
  from: `${FROM_NAME} <${FROM_EMAIL}>`,
  replyTo: process.env.EMAIL_REPLY_TO ?? FROM_EMAIL,
};

export { resend };

/**
 * Base email sender with retry logic
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  attachments?: { filename: string; content: Buffer | string }[];
  retryCount?: number;
}): Promise<{ id: string }> {
  const maxRetries = options.retryCount ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send({
        from: emailConfig.from,
        to: options.to,
        subject: options.subject,
        react: options.react,
        attachments: options.attachments,
      });

      if (result.error) throw new Error(result.error.message);
      return { id: result.data?.id ?? 'unknown' };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  throw lastError ?? new Error('Failed to send email after retries');
}

// ── Booking ─────────────────────────────────────────────────────────────────

export async function sendBookingConfirmation(params: {
  to: string;
  guestName: string;
  bookingId: string;
  bookingNumber: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  totalAmount: number;
  paymentMethod: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Booking Confirmed — ${params.bookingNumber}`,
    react: React.createElement(BookingConfirmationEmail, params),
  });
}

export async function sendCheckInReminder(params: {
  to: string;
  guestName: string;
  bookingNumber: string;
  roomNumber: string;
  checkIn: string;
  checkInTime: string;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelEmail?: string;
  hotelMapUrl?: string;
  documentsUploaded?: boolean;
}) {
  return sendEmail({
    to: params.to,
    subject: `Check-in Reminder — ${params.bookingNumber}`,
    react: React.createElement(CheckInReminderEmail, {
      ...params,
      hotelAddress: params.hotelAddress ?? 'The Rooms, MG Road, Bangalore',
      hotelPhone: params.hotelPhone ?? '+91 80 4567 8900',
      hotelEmail: params.hotelEmail ?? 'hello@therooms.in',
      hotelMapUrl: params.hotelMapUrl ?? '',
      documentsUploaded: params.documentsUploaded ?? false,
    }),
  });
}

export async function sendCheckOutReminder(params: {
  to: string;
  guestName: string;
  bookingNumber: string;
  roomNumber: string;
  checkOut: string;
  checkOutTime?: string;
  hasOutstanding?: boolean;
  outstandingAmount?: number;
  hotelPhone?: string;
  hotelEmail?: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Check-out Reminder — ${params.bookingNumber}`,
    react: React.createElement(CheckOutReminderEmail, {
      ...params,
      checkOutTime: params.checkOutTime ?? '11:00 AM',
      hasOutstanding: params.hasOutstanding ?? false,
      hotelPhone: params.hotelPhone ?? '+91 80 4567 8900',
      hotelEmail: params.hotelEmail ?? 'hello@therooms.in',
    }),
  });
}

// ── Payments ────────────────────────────────────────────────────────────────

export async function sendPaymentSuccess(params: {
  to: string;
  guestName: string;
  bookingNumber: string;
  roomType: string;
  roomNumber: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  checkIn: string;
  checkOut: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Payment Received — ${params.bookingNumber}`,
    react: React.createElement(PaymentSuccessEmail, params),
  });
}

export async function sendRefundNotification(
  to: string,
  bookingNumber: string,
  refundAmount: string | number,
  guestName?: string,
  reason?: string
) {
  return sendEmail({
    to,
    subject: `Refund Processed — ${bookingNumber}`,
    react: React.createElement(PaymentSuccessEmail, {
      guestName: guestName ?? 'Guest',
      bookingNumber,
      roomType: 'STUDIO',
      roomNumber: 'N/A',
      amount: Number(refundAmount),
      transactionId: `REFUND: ${reason ?? 'N/A'}`,
      paymentMethod: 'Refund',
      checkIn: '',
      checkOut: '',
    }),
  });
}

// ── Invoice ──────────────────────────────────────────────────────────────────

export async function sendInvoice(
  to: string,
  invoiceData: {
    guestName: string;
    guestEmail?: string;
    invoiceNumber: string;
    invoiceDate?: string;
    bookingNumber: string;
    roomType?: string;
    roomNumber?: string;
    checkIn?: string;
    checkOut?: string;
    guestsCount?: number;
    baseAmount?: number;
    discountAmount?: number;
    cgst?: number;
    sgst?: number;
    totalAmount?: number;
    paymentMethod?: string;
    transactionId?: string;
    pdfUrl?: string;
  },
  pdfPath?: string
) {
  return sendEmail({
    to,
    subject: `Invoice — ${invoiceData.invoiceNumber}`,
    react: React.createElement(InvoiceEmail, {
      guestName: invoiceData.guestName,
      guestEmail: invoiceData.guestEmail ?? to,
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate ?? new Date().toISOString(),
      bookingNumber: invoiceData.bookingNumber,
      roomType: invoiceData.roomType ?? 'STUDIO',
      roomNumber: invoiceData.roomNumber ?? 'N/A',
      checkIn: invoiceData.checkIn ?? '',
      checkOut: invoiceData.checkOut ?? '',
      guestsCount: invoiceData.guestsCount ?? 1,
      baseAmount: invoiceData.baseAmount ?? 0,
      discountAmount: invoiceData.discountAmount ?? 0,
      cgst: invoiceData.cgst ?? 0,
      sgst: invoiceData.sgst ?? 0,
      totalAmount: invoiceData.totalAmount ?? 0,
      paymentMethod: invoiceData.paymentMethod ?? 'Online',
      transactionId: invoiceData.transactionId ?? '',
      hotelName: 'The Rooms',
      hotelAddress: 'The Rooms, MG Road, Bangalore 560001',
      hotelPhone: '+91 80 4567 8900',
      hotelEmail: 'hello@therooms.in',
      hotelGstin: '29XXXXX1234X1Z5',
      invoicePdfUrl: invoiceData.pdfUrl,
    }),
    attachments: (pdfPath || invoiceData.pdfUrl)
      ? [{ filename: `invoice-${invoiceData.invoiceNumber}.pdf`, content: pdfPath ?? invoiceData.pdfUrl ?? '' }]
      : undefined,
  });
}

// ── Misc ─────────────────────────────────────────────────────────────────────

export async function sendExtendStayRequest(params: {
  to: string;
  guestName: string;
  bookingNumber: string;
  newCheckOut: string;
  guestPhone?: string;
  guestEmail?: string;
  roomNumber?: string;
  currentCheckOut?: string;
  additionalNights?: number;
  requestId?: string;
  foPortalUrl?: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Stay Extension Request — ${params.bookingNumber}`,
    react: React.createElement(ExtendStayRequestEmail, {
      guestName: params.guestName,
      guestPhone: params.guestPhone ?? '+91 XXXXX XXXXX',
      guestEmail: params.guestEmail ?? params.to,
      bookingNumber: params.bookingNumber,
      roomNumber: params.roomNumber ?? 'N/A',
      currentCheckOut: params.currentCheckOut ?? '',
      requestedCheckOut: params.newCheckOut,
      additionalNights: params.additionalNights ?? 1,
      requestId: params.requestId ?? `REQ-${Date.now()}`,
      foPortalUrl: params.foPortalUrl ?? process.env.FO_PORTAL_URL ?? 'https://admin.therooms.in',
    }),
  });
}

export async function sendGuestComplaint(params: {
  to: string;
  guestName: string;
  complaint: string;
  bookingNumber?: string;
  guestPhone?: string;
  guestEmail?: string;
  roomNumber?: string;
  checkIn?: string;
  checkOut?: string;
  subject?: string;
  complaintId?: string;
  isUrgent?: boolean;
  imageUrl?: string;
  complaintUrl?: string;
  createdAt?: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Complaint Received — ${params.bookingNumber ?? 'New'}`,
    react: React.createElement(GuestComplaintEmail, {
      guestName: params.guestName,
      guestPhone: params.guestPhone ?? '+91 XXXXX XXXXX',
      guestEmail: params.guestEmail ?? params.to,
      bookingNumber: params.bookingNumber ?? 'N/A',
      roomNumber: params.roomNumber ?? 'N/A',
      checkIn: params.checkIn ?? '',
      checkOut: params.checkOut ?? '',
      complaintId: params.complaintId ?? `CMPT-${Date.now()}`,
      subject: params.subject ?? 'Guest Complaint',
      description: params.complaint,
      isUrgent: params.isUrgent ?? false,
      imageUrl: params.imageUrl,
      complaintUrl: params.complaintUrl ?? process.env.ADMIN_PORTAL_URL ?? 'https://admin.therooms.in',
      createdAt: params.createdAt ?? new Date().toISOString(),
    }),
  });
}
