// packages/email/send.ts
// Email sending functions for The Rooms

import React from 'react';
import { sendEmail } from './index';
import {
  BookingConfirmationEmail,
  CheckInReminderEmail,
  CheckOutReminderEmail,
  PaymentSuccessEmail,
  InvoiceEmail,
  ExtendStayRequestEmail,
  GuestComplaintEmail,
} from './templates';
import { createAuditLog } from '@the-rooms/api/middleware';

// ── Hotel Info (should come from DB/settings in production) ──────────────────

const HOTEL = {
  name: 'The Rooms',
  address: 'The Rooms Hotel, India',
  phone: '+91-XXX-XXX-XXXX',
  email: 'hello@therooms.in',
  gstin: 'XXXXXXXXXXXXXXX',
  website: 'https://therooms.in',
};

// ── Booking Confirmation ──────────────────────────────────────────────────────

export async function sendBookingConfirmation(
  guestEmail: string,
  bookingId: string
): Promise<{ id: string }> {
  const { db } = await import('@the-rooms/db');

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true, room: true },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  const checkIn = booking.checkIn.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const checkOut = booking.checkOut.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const email = React.createElement(BookingConfirmationEmail, {
    guestName: booking.guest.name,
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    roomType: booking.room.type,
    roomNumber: booking.room.roomNumber,
    checkIn,
    checkOut,
    guestsCount: booking.guestsCount,
    totalAmount: Number(booking.totalAmount),
    paymentMethod: 'Online Payment',
    hotelAddress: HOTEL.address,
    hotelPhone: HOTEL.phone,
    hotelEmail: HOTEL.email,
  });

  const result = await sendEmail({
    to: guestEmail,
    subject: `Booking Confirmed! ${booking.bookingNumber} - ${booking.room.type} Room`,
    react: email,
  });

  await createAuditLog({
    action: 'EMAIL_SENT',
    entity: 'booking',
    entityId: bookingId,
    metadata: { type: 'booking_confirmation', to: guestEmail, emailId: result.id },
  });

  return result;
}

// ── Check-in Reminder ────────────────────────────────────────────────────────

export async function sendCheckInReminder(
  guestEmail: string,
  bookingId: string
): Promise<{ id: string }> {
  const { db } = await import('@the-rooms/db');

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true, room: true },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Check if documents are uploaded
  const documents = await db.guestDocument.findMany({
    where: { bookingId },
  });
  const documentsUploaded = documents.length > 0 && documents.every((d) => d.frontUrl);

  const checkIn = booking.checkIn.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const email = React.createElement(CheckInReminderEmail, {
    guestName: booking.guest.name,
    bookingNumber: booking.bookingNumber,
    roomNumber: booking.room.roomNumber,
    checkIn,
    checkInTime: '2:00 PM IST',
    hotelAddress: HOTEL.address,
    hotelPhone: HOTEL.phone,
    hotelEmail: HOTEL.email,
    hotelMapUrl: HOTEL.website,
    documentsUploaded,
  });

  const result = await sendEmail({
    to: guestEmail,
    subject: `Reminder: Check-in tomorrow at The Rooms - Room ${booking.room.roomNumber}`,
    react: email,
  });

  await createAuditLog({
    action: 'EMAIL_SENT',
    entity: 'booking',
    entityId: bookingId,
    metadata: { type: 'checkin_reminder', to: guestEmail, emailId: result.id },
  });

  return result;
}

// ── Check-out Reminder ───────────────────────────────────────────────────────

export async function sendCheckOutReminder(
  guestEmail: string,
  bookingId: string
): Promise<{ id: string }> {
  const { db } = await import('@the-rooms/db');

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true, room: true },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  const checkOut = booking.checkOut.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  // Check for outstanding balance
  const payments = await db.payment.findMany({
    where: { bookingId },
  });
  const totalPaid = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const hasOutstanding = totalPaid < Number(booking.totalAmount);
  const outstandingAmount = Number(booking.totalAmount) - totalPaid;

  const email = React.createElement(CheckOutReminderEmail, {
    guestName: booking.guest.name,
    bookingNumber: booking.bookingNumber,
    roomNumber: booking.room.roomNumber,
    checkOut,
    checkOutTime: '11:00 AM IST',
    hasOutstanding,
    outstandingAmount,
    hotelPhone: HOTEL.phone,
    hotelEmail: HOTEL.email,
  });

  const result = await sendEmail({
    to: guestEmail,
    subject: `Reminder: Check-out today at 11 AM - Room ${booking.room.roomNumber}`,
    react: email,
  });

  await createAuditLog({
    action: 'EMAIL_SENT',
    entity: 'booking',
    entityId: bookingId,
    metadata: { type: 'checkout_reminder', to: guestEmail, emailId: result.id },
  });

  return result;
}

// ── Payment Success ───────────────────────────────────────────────────────────

export async function sendPaymentSuccess(
  guestEmail: string,
  bookingId: string
): Promise<{ id: string }> {
  const { db } = await import('@the-rooms/db');

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true, room: true },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  const payment = await db.payment.findFirst({
    where: { bookingId, status: 'PAID' },
  });

  if (!payment) {
    throw new Error('No paid payment found');
  }

  const checkIn = booking.checkIn.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const checkOut = booking.checkOut.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const email = React.createElement(PaymentSuccessEmail, {
    guestName: booking.guest.name,
    bookingNumber: booking.bookingNumber,
    roomType: booking.room.type,
    roomNumber: booking.room.roomNumber,
    amount: Number(payment.amount),
    transactionId: payment.gatewayRef ?? payment.transactionId ?? 'N/A',
    paymentMethod: payment.method,
    checkIn,
    checkOut,
  });

  const result = await sendEmail({
    to: guestEmail,
    subject: `Payment of ₹${Number(payment.amount).toLocaleString('en-IN')} received`,
    react: email,
  });

  await createAuditLog({
    action: 'EMAIL_SENT',
    entity: 'payment',
    entityId: payment.id,
    metadata: { type: 'payment_success', to: guestEmail, emailId: result.id },
  });

  return result;
}

// ── Invoice Email ────────────────────────────────────────────────────────────

export async function sendInvoice(
  guestEmail: string,
  bookingId: string,
  invoicePdfUrl?: string
): Promise<{ id: string }> {
  const { db } = await import('@the-rooms/db');

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true, room: true },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  const invoice = await db.invoice.findUnique({
    where: { bookingId },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const payment = await db.payment.findFirst({
    where: { bookingId, status: 'PAID' },
  });

  const baseAmount = Number(booking.baseAmount);
  const discountAmount = Number(booking.discountAmount);
  const taxableAmount = baseAmount - discountAmount;
  const cgst = taxableAmount * 0.09;
  const sgst = taxableAmount * 0.09;

  const invoiceDate = invoice.issuedAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const checkIn = booking.checkIn.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const checkOut = booking.checkOut.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const email = React.createElement(InvoiceEmail, {
    guestName: booking.guest.name,
    guestEmail: booking.guest.email ?? '',
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate,
    bookingNumber: booking.bookingNumber,
    roomType: booking.room.type,
    roomNumber: booking.room.roomNumber,
    checkIn,
    checkOut,
    guestsCount: booking.guestsCount,
    baseAmount,
    discountAmount,
    cgst,
    sgst,
    totalAmount: Number(booking.totalAmount),
    paymentMethod: payment?.method ?? 'N/A',
    transactionId: payment?.gatewayRef ?? 'N/A',
    hotelName: HOTEL.name,
    hotelAddress: HOTEL.address,
    hotelPhone: HOTEL.phone,
    hotelEmail: HOTEL.email,
    hotelGstin: HOTEL.gstin,
    invoicePdfUrl,
  });

  const result = await sendEmail({
    to: guestEmail,
    subject: `Invoice ${invoice.invoiceNumber} from ${HOTEL.name}`,
    react: email,
  });

  await createAuditLog({
    action: 'EMAIL_SENT',
    entity: 'invoice',
    entityId: invoice.id,
    metadata: { type: 'invoice', to: guestEmail, emailId: result.id },
  });

  return result;
}

// ── Extend Stay Request (to FO) ──────────────────────────────────────────────

export async function sendExtendStayRequest(
  foEmail: string,
  requestId: string
): Promise<{ id: string }> {
  const { db } = await import('@the-rooms/db');

  const complaint = await db.complaint.findUnique({
    where: { id: requestId },
    include: { booking: { include: { guest: true, room: true } } },
  });

  // This is actually for extend requests, but we reuse the complaint model
  // In production, you'd have a separate ExtendRequest model
  const booking = await db.booking.findUnique({
    where: { id: requestId },
    include: { guest: true, room: true },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  const currentCheckOut = booking.checkOut.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const email = React.createElement(ExtendStayRequestEmail, {
    guestName: booking.guest.name,
    guestPhone: booking.guest.phone,
    guestEmail: booking.guest.email ?? '',
    bookingNumber: booking.bookingNumber,
    roomNumber: booking.room.roomNumber,
    currentCheckOut,
    requestedCheckOut: 'To be determined',
    additionalNights: 0,
    requestId,
    foPortalUrl: `${HOTEL.website}/fo/extensions`,
  });

  const result = await sendEmail({
    to: foEmail,
    subject: `Stay Extension Request - ${booking.bookingNumber} - ${booking.guest.name}`,
    react: email,
  });

  await createAuditLog({
    action: 'EMAIL_SENT',
    entity: 'booking',
    entityId: booking.id,
    metadata: { type: 'extend_request', to: foEmail, emailId: result.id },
  });

  return result;
}

// ── Complaint Notification (to FO) ─────────────────────────────────────────

export async function sendComplaintNotification(
  foEmail: string,
  complaintId: string
): Promise<{ id: string }> {
  const { db } = await import('@the-rooms/db');

  const complaint = await db.complaint.findUnique({
    where: { id: complaintId },
    include: { booking: { include: { guest: true, room: true } } },
  });

  if (!complaint) {
    throw new Error('Complaint not found');
  }

  const booking = complaint.booking;

  const checkIn = booking.checkIn.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const checkOut = booking.checkOut.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const createdAt = complaint.createdAt.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

  const email = React.createElement(GuestComplaintEmail, {
    guestName: booking.guest.name,
    guestPhone: booking.guest.phone,
    guestEmail: booking.guest.email ?? '',
    bookingNumber: booking.bookingNumber,
    roomNumber: booking.room.roomNumber,
    checkIn,
    checkOut,
    complaintId: complaint.id,
    subject: complaint.subject,
    description: complaint.description,
    isUrgent: complaint.isUrgent,
    imageUrl: complaint.imageUrl ?? undefined,
    complaintUrl: `${HOTEL.website}/fo/complaints/${complaintId}`,
    createdAt,
  });

  const result = await sendEmail({
    to: foEmail,
    subject: complaint.isUrgent
      ? `URGENT: ${complaint.subject} - Room ${booking.room.roomNumber}`
      : `${complaint.subject} - Room ${booking.room.roomNumber}`,
    react: email,
  });

  await createAuditLog({
    action: 'EMAIL_SENT',
    entity: 'complaint',
    entityId: complaintId,
    metadata: { type: 'complaint_notification', to: foEmail, emailId: result.id },
  });

  return result;
}

// ── System Alert (to Admin/Super Admin) ─────────────────────────────────────

export async function sendSystemAlert(
  adminEmail: string,
  alertMessage: string,
  severity: 'INFO' | 'WARNING' | 'ERROR' = 'ERROR'
): Promise<{ id: string }> {
  const subject =
    severity === 'ERROR'
      ? `🚨 System Error: ${HOTEL.name}`
      : severity === 'WARNING'
        ? `⚠️ Warning: ${HOTEL.name}`
        : `ℹ️ System Update: ${HOTEL.name}`;

  const emailHtml = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAFAF8;">
      <div style="background: ${severity === 'ERROR' ? '#FEE2E2' : severity === 'WARNING' ? '#FEF3C7' : '#E0F2FE'}; border-radius: 12px; padding: 30px; margin-bottom: 20px; border-left: 4px solid ${severity === 'ERROR' ? '#EF4444' : severity === 'WARNING' ? '#F59E0B' : '#3B82F6'};">
        <h2 style="margin: 0 0 10px; color: ${severity === 'ERROR' ? '#991B1B' : severity === 'WARNING' ? '#92400E' : '#1E40AF'}; font-size: 18px;">${severity === 'ERROR' ? 'Error' : severity === 'WARNING' ? 'Warning' : 'Info'}</h2>
        <p style="margin: 0; color: ${severity === 'ERROR' ? '#991B1B' : severity === 'WARNING' ? '#92400E' : '#1E40AF'}; font-size: 14px; line-height: 1.6;">${alertMessage}</p>
      </div>
      <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <p style="margin: 0 0 10px; font-size: 12px; color: #636E72;">Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
        <p style="margin: 0; font-size: 12px; color: #636E72;">Server: ${process.env.NODE_ENV || 'production'}</p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    react: React.createElement(React.Fragment, null, emailHtml),
  });

  await createAuditLog({
    action: 'EMAIL_SENT',
    entity: 'system',
    metadata: { type: 'system_alert', to: adminEmail, severity, emailId: result.id },
  });

  return result;
}

// ── Refund Notification ──────────────────────────────────────────────────────

export async function sendRefundNotification(
  guestEmail: string,
  bookingNumber: string,
  refundAmount: number
): Promise<{ id: string }> {
  const emailHtml = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAFAF8;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #2D3436; letter-spacing: 2px;">THE ROOMS</h1>
      </div>
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center;">
        <div style="font-size: 48px; color: #10B981; margin-bottom: 20px;">✓</div>
        <h2 style="margin: 0 0 15px; font-size: 26px; color: #2D3436;">Refund Processed</h2>
        <p style="margin: 0 0 20px; font-size: 16px; color: #636E72;">
          A refund of <strong>₹${refundAmount.toLocaleString('en-IN')}</strong> has been initiated for booking ${bookingNumber}.
        </p>
        <p style="margin: 0 0 20px; font-size: 14px; color: #636E72;">
          The refund will be credited to your original payment method within 5-7 working days.
        </p>
        <p style="margin: 0; font-size: 14px; color: #636E72;">
          If you have any questions, please contact us at ${HOTEL.email}
        </p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: guestEmail,
    subject: `Refund of ₹${refundAmount.toLocaleString('en-IN')} initiated - Booking ${bookingNumber}`,
    react: React.createElement(React.Fragment, null, emailHtml),
  });

  await createAuditLog({
    action: 'EMAIL_SENT',
    entity: 'booking',
    metadata: { type: 'refund_notification', to: guestEmail, emailId: result.id },
  });

  return result;
}
