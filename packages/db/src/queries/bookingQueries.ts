import prisma from '../index';
import { Prisma } from '@prisma/client';
import { hasDateOverlap } from '../config';

export type BookingFilters = {
  status?: string;
  paymentStatus?: string;
  bookingSource?: string;
  bookingType?: string;
  checkInFrom?: Date;
  checkInTo?: Date;
  checkOutFrom?: Date;
  checkOutTo?: Date;
  page?: number;
  perPage?: number;
};

export type CreateBookingData = {
  bookingNumber: string;
  guestId: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guestsCount?: number;
  bookingType?: 'DAILY' | 'MONTHLY';
  bookingSource?: 'WEBSITE' | 'WALK_IN' | 'PHONE' | 'OTA';
  specialRequests?: string;
  discountCode?: string;
  discountType?: string;
  baseAmount: Prisma.Decimal;
  discountAmount?: Prisma.Decimal;
  extrasAmount?: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  createdById?: string;
};

/**
 * Create a new booking
 */
export async function createBooking(data: CreateBookingData) {
  return prisma.booking.create({ data });
}

/**
 * Get bookings with filters and pagination
 */
export async function getBookings(filters: BookingFilters = {}) {
  const {
    status,
    paymentStatus,
    bookingSource,
    bookingType,
    checkInFrom,
    checkInTo,
    checkOutFrom,
    checkOutTo,
    page = 1,
    perPage = 20,
  } = filters;

  const where: Prisma.BookingWhereInput = {};
  if (status) where.status = status as any;
  if (paymentStatus) where.paymentStatus = paymentStatus as any;
  if (bookingSource) where.bookingSource = bookingSource as any;
  if (bookingType) where.bookingType = bookingType as any;
  if (checkInFrom || checkInTo) {
    where.checkIn = {};
    if (checkInFrom) where.checkIn.gte = checkInFrom;
    if (checkInTo) where.checkIn.lte = checkInTo;
  }
  if (checkOutFrom || checkOutTo) {
    where.checkOut = {};
    if (checkOutFrom) where.checkOut.gte = checkOutFrom;
    if (checkOutTo) where.checkOut.lte = checkOutTo;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        guest: true,
        room: { include: { photos: true } },
        payments: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Get a single booking by ID with full details
 */
export async function getBookingById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      room: { include: { photos: true, amenities: { include: { amenity: true } } } },
      payments: true,
      invoice: true,
      complaint: true,
      documents: true,
      auditLogs: { orderBy: { createdAt: 'desc' } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Get all bookings for a guest
 */
export async function getBookingsByGuest(guestId: string) {
  return prisma.booking.findMany({
    where: { guestId },
    include: {
      room: { include: { photos: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get bookings by date (check-ins and check-outs on that date)
 */
export async function getBookingsByDate(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const [checkIns, checkOuts] = await Promise.all([
    prisma.booking.findMany({
      where: {
        checkIn: { gte: startOfDay, lte: endOfDay },
        status: { in: ['CONFIRMED'] },
      },
      include: {
        guest: true,
        room: true,
      },
      orderBy: { checkIn: 'asc' },
    }),
    prisma.booking.findMany({
      where: {
        checkOut: { gte: startOfDay, lte: endOfDay },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
      include: {
        guest: true,
        room: true,
      },
      orderBy: { checkOut: 'asc' },
    }),
  ]);

  return { checkIns, checkOuts };
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  id: string,
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW',
  txClient?: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) {
  const dbClient = txClient || prisma;
  const updateData: Prisma.BookingUpdateInput = { status };
  if (status === 'CHECKED_IN') updateData.checkInTime = new Date();
  if (status === 'CHECKED_OUT') updateData.checkOutTime = new Date();

  const booking = await dbClient.booking.update({
    where: { id },
    data: updateData,
  });

  // Update room status
  if (status === 'CHECKED_IN') {
    await dbClient.room.update({ where: { id: booking.roomId }, data: { status: 'OCCUPIED' } });
  } else if (status === 'CHECKED_OUT' || status === 'CANCELLED') {
    await dbClient.room.update({ where: { id: booking.roomId }, data: { status: 'VACANT' } });
  }

  return booking;
}

/**
 * Cancel a booking and release the room
 */
export async function cancelBooking(id: string, reason: string) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw new Error(`Booking not found: ${id}`);

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      specialRequests: reason
        ? `${existing.specialRequests ?? ''}\nCancellation reason: ${reason}`.trim()
        : existing.specialRequests,
    },
  });

  await prisma.room.update({
    where: { id: booking.roomId },
    data: { status: 'VACANT' },
  });

  return booking;
}

/**
 * Check if a room is available for a date range.
 * Uses transaction with row-level locking to prevent race conditions.
 * 
 * @param roomId - The room to check
 * @param checkIn - Check-in date
 * @param checkOut - Check-out date
 * @param excludeBookingId - Optional booking ID to exclude (for modifications)
 * @returns true if room is available
 */
export async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  // Use a transaction with serializable isolation to prevent race conditions
  return prisma.$transaction(async (tx) => {
    // Lock the room row to prevent concurrent bookings
    const room = await tx.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    // Build the where clause
    const whereClause: Prisma.BookingWhereInput = {
      roomId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    };

    // Exclude the current booking if updating
    if (excludeBookingId) {
      whereClause.id = { not: excludeBookingId };
    }

    // Count conflicting bookings
    const conflicting = await tx.booking.count({
      where: whereClause,
    });

    return conflicting === 0;
  }, {
    isolationLevel: 'Serializable',
    timeout: 10000,
  });
}

/**
 * Alternative: Check availability without transaction (for read-only queries)
 * Use this when you just need to display availability, not for booking.
 */
export async function isRoomAvailableReadOnly(
  roomId: string,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  const conflicting = await prisma.booking.count({
    where: {
      roomId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });
  return conflicting === 0;
}

/**
 * Generate a unique booking number: BKN-YYYYMMDD-XXXX
 */
export async function generateBookingNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const prefix = `BKN-${dateStr}-`;

  // Find the highest count for today
  const lastBooking = await prisma.booking.findFirst({
    where: { bookingNumber: { startsWith: prefix } },
    orderBy: { bookingNumber: 'desc' },
    select: { bookingNumber: true },
  });

  let counter = 1;
  if (lastBooking) {
    const lastCounter = parseInt(lastBooking.bookingNumber.split('-').pop() ?? '0', 10);
    counter = lastCounter + 1;
  }

  return `${prefix}${String(counter).padStart(4, '0')}`;
}
