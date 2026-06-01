import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Named export alias so API routes can use `const { db } = await import('@the-rooms/db')`
export const db = prisma;

// Re-export all query helpers so callers can use `@the-rooms/db` as a single import
export { createPayment, updatePaymentStatus, getPaymentsByBooking, getPaymentsByDateRange, recordRefund } from './queries/paymentQueries';
export { createBooking, getBookingById, getBookings, getBookingsByGuest, getBookingsByDate, updateBookingStatus, cancelBooking, isRoomAvailable, generateBookingNumber } from './queries/bookingQueries';
export { getGuestByEmail, getGuestByPhone, uploadGuestDocument, getGuestDocuments, getDocumentsByBooking, createComplaint, getGuestComplaints, getComplaintByBooking, getGuestInvoices, getInvoiceById, getExtendStayRequest, createExtendStayRequest, createAddonRequest, getGuestAddonRequests, getGuestDashboardStats } from './queries/guestQueries';
export { getAllRooms, getAvailableRooms, getRoomById, getRoomsByType, updateRoomStatus, bulkUpdateRoomStatus } from './queries/roomQueries';
export { generateInvoice, updateInvoicePdfUrl, getInvoiceByBookingId, getInvoiceByNumber } from './queries/invoiceQueries';
export { calculatePrice, calculateBookingPrice } from './pricing';

export { Prisma, ExpenseCategory } from '@prisma/client';

export default prisma;
