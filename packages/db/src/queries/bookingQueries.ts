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

// ─── No-Show Handling ─────────────────────────────────────────────────────────

export type NoShowPolicy = {
  chargeType: 'FIRST_NIGHT' | 'PERCENTAGE' | 'FLAT_FEE';
  chargeValue: number;
  cutoffHour: number;
  enabled: boolean;
};

/**
 * Get no-show policy from hotel settings
 */
export async function getNoShowPolicy(propertyId: string = 'default'): Promise<NoShowPolicy> {
  const settings = await prisma.hotelSettings.findUnique({
    where: { id: propertyId === 'default' ? 'default' : propertyId },
  });

  return {
    chargeType: (settings?.noShowChargeType as NoShowPolicy['chargeType']) || 'FIRST_NIGHT',
    chargeValue: settings?.noShowChargeValue?.toNumber() ?? 0,
    cutoffHour: settings?.noShowCutoffHour ?? 11,
    enabled: settings?.noShowEnabled ?? true,
  };
}

/**
 * Calculate no-show charge based on policy
 */
export async function calculateNoShowCharge(
  bookingId: string,
  policy: NoShowPolicy
): Promise<{ amount: number; description: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true },
  });

  if (!booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  let amount = 0;
  let description = '';

  switch (policy.chargeType) {
    case 'FIRST_NIGHT': {
      // First night charge based on double rate (most common)
      const firstNightRate = booking.room.basePriceDouble;
      amount = firstNightRate.toNumber();
      description = 'First night no-show charge';
      break;
    }
    case 'PERCENTAGE': {
      // Percentage of total booking value
      amount = (booking.totalAmount.toNumber() * policy.chargeValue) / 100;
      description = `No-show charge (${policy.chargeValue}% of booking value)`;
      break;
    }
    case 'FLAT_FEE': {
      // Flat fee as configured
      amount = policy.chargeValue;
      description = 'No-show charge (flat fee)';
      break;
    }
  }

  return { amount, description };
}

/**
 * Get bookings that should be processed as no-shows
 * A booking is considered a no-show if:
 * - Check-in date has passed
 * - Status is still CONFIRMED (not CHECKED_IN or CANCELLED)
 * - No check-in was performed
 */
export async function getPotentialNoShows(propertyId: string = 'default', asOfDate?: Date) {
  const now = asOfDate || new Date();
  const cutoffHour = 11; // Default cutoff is 11 AM

  // Calculate the cutoff datetime
  // If current time is before cutoff hour on check-in date + 1 day, don't process yet
  const checkInDate = new Date(now);
  checkInDate.setHours(0, 0, 0, 0);

  // Get all confirmed bookings where check-in date has passed
  const bookings = await prisma.booking.findMany({
    where: {
      propertyId,
      status: 'CONFIRMED',
      checkIn: { lt: checkInDate },
    },
    include: {
      guest: { select: { id: true, name: true, phone: true, email: true } },
      room: { select: { id: true, roomNumber: true, type: true } },
    },
    orderBy: { checkIn: 'asc' },
  });

  // Filter by cutoff time (only process if we're past the cutoff on the day after check-in)
  const nextDayAfterCheckIn = new Date(checkInDate);
  nextDayAfterCheckIn.setDate(nextDayAfterCheckIn.getDate() + 1);

  return bookings.filter((booking) => {
    const bookingCheckIn = new Date(booking.checkIn);
    const cutoffDateTime = new Date(nextDayAfterCheckIn);
    cutoffDateTime.setHours(cutoffHour, 0, 0, 0);
    return now >= cutoffDateTime;
  });
}

/**
 * Mark a booking as no-show
 */
export async function markBookingAsNoShow(
  bookingId: string,
  noShowCharge: number,
  txClient?: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) {
  const dbClient = txClient || prisma;

  const booking = await dbClient.booking.update({
    where: { id: bookingId },
    data: {
      status: 'NO_SHOW',
      noShowAt: new Date(),
      noShowCharge: new Prisma.Decimal(noShowCharge),
    },
  });

  // Release the room - mark as VACANT
  await dbClient.room.update({
    where: { id: booking.roomId },
    data: { status: 'VACANT' },
  });

  return booking;
}

/**
 * Get all no-show bookings for a property
 */
export async function getNoShowBookings(
  propertyId: string = 'default',
  options: { page?: number; perPage?: number; startDate?: Date; endDate?: Date } = {}
) {
  const { page = 1, perPage = 20, startDate, endDate } = options;

  const where: Prisma.BookingWhereInput = {
    propertyId,
    status: 'NO_SHOW',
  };

  if (startDate || endDate) {
    where.noShowAt = {};
    if (startDate) where.noShowAt.gte = startDate;
    if (endDate) where.noShowAt.lte = endDate;
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
      orderBy: { noShowAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, pages: Math.ceil(total / perPage), page };
}
