import prisma from '../index';
import { Room, RoomType, RoomStatus, CleaningStatus, Prisma } from '@prisma/client';

/**
 * Get all rooms with photos and amenities
 */
export async function getAllRooms() {
  return prisma.room.findMany({
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      amenities: { include: { amenity: true } },
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  });
}

/**
 * Get available rooms for a date range
 * (rooms NOT booked where booking status is not CANCELLED/NO_SHOW and date ranges overlap)
 */
export async function getAvailableRooms(checkIn: Date, checkOut: Date) {
  return prisma.room.findMany({
    where: {
      status: 'VACANT',
      cleaningStatus: 'CLEAN',
      NOT: {
        bookings: {
          some: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
          },
        },
      },
    },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      amenities: { include: { amenity: true } },
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  });
}

/**
 * Get a single room by ID with full details
 */
export async function getRoomById(id: string) {
  return prisma.room.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      amenities: { include: { amenity: true } },
      cleanedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Get rooms filtered by type
 */
export async function getRoomsByType(type: RoomType) {
  return prisma.room.findMany({
    where: { type },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      amenities: { include: { amenity: true } },
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  });
}

/**
 * Update room status
 */
export async function updateRoomStatus(id: string, status: RoomStatus) {
  return prisma.room.update({
    where: { id },
    data: { status },
  });
}

/**
 * Bulk update room statuses
 */
export async function bulkUpdateRoomStatus(ids: string[], status: RoomStatus) {
  return prisma.room.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });
}

// ─── Housekeeping Queries ───────────────────────────────────────────────────────

/**
 * Get rooms that need cleaning (DIRTY or CLEANING status)
 */
export async function getRoomsNeedingCleaning() {
  return prisma.room.findMany({
    where: {
      cleaningStatus: { in: ['DIRTY', 'CLEANING'] },
    },
    include: {
      cleanedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [
      { cleaningStatus: 'asc' }, // DIRTY first, then CLEANING
      { floor: 'asc' },
      { roomNumber: 'asc' },
    ],
  });
}

/**
 * Get rooms by cleaning status
 */
export async function getRoomsByCleaningStatus(status: CleaningStatus) {
  return prisma.room.findMany({
    where: { cleaningStatus: status },
    include: {
      cleanedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  });
}

/**
 * Mark room as cleaned
 */
export async function markRoomAsCleaned(
  roomId: string,
  cleanedById: string,
  notes?: string,
  txClient?: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) {
  // If txClient is provided, use it directly (caller manages transaction)
  // Otherwise use prisma with its own transaction
  if (txClient) {
    return markRoomAsCleanedInternal(roomId, cleanedById, notes, txClient);
  }
  return prisma.$transaction((tx) => markRoomAsCleanedInternal(roomId, cleanedById, notes, tx));
}

async function markRoomAsCleanedInternal(
  roomId: string,
  cleanedById: string,
  notes: string | undefined,
  tx: Prisma.TransactionClient
) {
  // Update room to CLEAN status
  const room = await tx.room.update({
    where: { id: roomId },
    data: {
      cleaningStatus: 'CLEAN',
      lastCleanedAt: new Date(),
      cleanedById,
      cleaningNotes: notes || null,
    },
    include: {
      cleanedBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Create HK task with COMPLETED status for audit tracking
  // (since cleaning already happened, we create directly as COMPLETED)
  await tx.housekeepingTask.create({
    data: {
      roomId,
      assigneeId: cleanedById,
      date: new Date(),
      status: 'COMPLETED',
      notes: notes || 'Room cleaned',
    },
  });

  return room;
}

/**
 * Mark room as dirty (manual trigger)
 */
export async function markRoomAsDirty(
  roomId: string,
  notes?: string,
  txClient?: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) {
  const dbClient = txClient || prisma;
  return dbClient.room.update({
    where: { id: roomId },
    data: {
      cleaningStatus: 'DIRTY',
      cleaningNotes: notes || null,
    },
  });
}

/**
 * Mark room as cleaning in progress
 */
export async function markRoomAsCleaning(roomId: string, cleanedById: string) {
  return prisma.room.update({
    where: { id: roomId },
    data: {
      cleaningStatus: 'CLEANING',
      cleanedById,
    },
  });
}

/**
 * Update room cleaning notes
 */
export async function updateRoomCleaningNotes(roomId: string, notes: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const timestamp = new Date().toISOString().split('T')[0];
  const newNote = `[${timestamp}]: ${notes}`;

  return prisma.room.update({
    where: { id: roomId },
    data: {
      cleaningNotes: room?.cleaningNotes
        ? `${room.cleaningNotes}\n${newNote}`
        : newNote,
    },
  });
}

/**
 * Report maintenance issue for a room
 */
export async function reportRoomMaintenance(roomId: string, notes?: string) {
  return prisma.room.update({
    where: { id: roomId },
    data: {
      status: 'MAINTENANCE',
      cleaningStatus: 'DIRTY',
      cleaningNotes: notes
        ? `Maintenance reported: ${notes}`
        : 'Maintenance reported - room marked as dirty',
    },
  });
}

// ─── Room Assignment Logic ─────────────────────────────────────────────────────

export type RoomAssignmentResult = {
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  floor: number;
  assignmentType: 'PRE_ASSIGNED' | 'AUTO_ASSIGN';
  score: number;
  reasons: string[];
};

export type RoomAssignmentPreferences = {
  preferredRoomId?: string;
  preferredFloor?: number;
  excludeRoomIds?: string[];
};

/**
 * Find the best available room for a booking based on multiple criteria
 * 
 * Scoring algorithm:
 * - Preferred room: +1000
 * - Clean status: +100 (CLEAN), +50 (CLEANING)
 * - Floor proximity to lobby (lower floor = better for walk-ins): +50 to +0
 * - Room features match guest count: +30
 * - Recently cleaned (within 4 hours): +20
 * - No priority cleaning needed: +10
 */
export async function findBestAvailableRoom(
  checkIn: Date,
  checkOut: Date,
  roomType: RoomType,
  guestsCount: number = 1,
  preferences: RoomAssignmentPreferences = {},
  propertyId: string = 'default'
): Promise<RoomAssignmentResult | null> {
  const isWalkin = isSameDay(checkIn, new Date());

  // Find all rooms of the requested type that are vacant
  const availableRooms = await prisma.room.findMany({
    where: {
      type: roomType,
      status: 'VACANT',
      propertyId,
      // For walk-ins, we want clean rooms only
      cleaningStatus: isWalkin ? 'CLEAN' : { in: ['CLEAN', 'CLEANING'] },
      // Exclude specified rooms
      id: preferences.excludeRoomIds?.length
        ? { notIn: preferences.excludeRoomIds }
        : undefined,
    },
    include: {
      holds: {
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
      },
    },
  });

  // Filter out rooms with active holds (except HOUSEKEEPING holds)
  const trulyAvailable = availableRooms.filter(
    room => room.holds.length === 0 ||
      room.holds.every(h => h.holdType === 'HOUSEKEEPING')
  );

  if (trulyAvailable.length === 0) {
    return null;
  }

  // Score each room
  const scoredRooms = trulyAvailable.map(room => scoreRoom(room, {
    checkIn,
    checkOut,
    roomType,
    guestsCount,
    preferredRoomId: preferences.preferredRoomId,
    preferredFloor: preferences.preferredFloor,
    isWalkin,
  }));

  // Sort by score descending
  scoredRooms.sort((a, b) => b.score - a.score);

  return scoredRooms[0];
}

function scoreRoom(
  room: Room & { holds: any[] },
  input: {
    checkIn: Date;
    checkOut: Date;
    roomType: RoomType;
    guestsCount: number;
    preferredRoomId?: string;
    preferredFloor?: number;
    isWalkin: boolean;
  }
): RoomAssignmentResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. Preferred room (highest priority)
  if (input.preferredRoomId === room.id) {
    score += 1000;
    reasons.push('Preferred room selected');
  }

  // 2. Cleaning status
  if (room.cleaningStatus === 'CLEAN') {
    score += 100;
    reasons.push('Room is clean and ready');
  } else if (room.cleaningStatus === 'CLEANING') {
    score += 50;
    reasons.push('Room is being cleaned');
  }

  // 3. Floor proximity to lobby (lower = better for walk-ins)
  if (input.isWalkin) {
    const floorScore = Math.max(0, 50 - (room.floor * 5));
    score += floorScore;
    if (floorScore > 0) {
      reasons.push(`Floor ${room.floor} (close to lobby)`);
    }
  }

  // 4. Room features match guest count
  if (room.maxOccupancy >= input.guestsCount) {
    score += 30;
    reasons.push(`Occupancy ${room.maxOccupancy} suitable for ${input.guestsCount} guests`);
  }

  // 5. Recent cleaning
  if (room.lastCleanedAt) {
    const hoursSinceCleaning = (Date.now() - room.lastCleanedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCleaning < 4) {
      score += 20;
      reasons.push('Recently cleaned');
    }
  }

  // 6. No priority cleaning needed
  if (!room.isPriorityCleaning) {
    score += 10;
    reasons.push('No priority cleaning required');
  }

  // 7. Preferred floor match
  if (input.preferredFloor === room.floor) {
    score += 25;
    reasons.push(`Matches preferred floor ${room.floor}`);
  }

  return {
    roomId: room.id,
    roomNumber: room.roomNumber,
    roomType: room.type,
    floor: room.floor,
    assignmentType: input.isWalkin ? 'PRE_ASSIGNED' : 'AUTO_ASSIGN',
    score,
    reasons,
  };
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

/**
 * Pre-assign a room to a booking
 */
export async function preAssignRoom(bookingId: string, roomId: string) {
  return prisma.$transaction(async (tx) => {
    // Get booking details
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    // Create or update booking room assignment
    const assignment = await tx.bookingRoomAssignment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        assignmentType: 'PRE_ASSIGNED',
        preAssignedRoomId: roomId,
        preAssignedAt: new Date(),
        finalRoomId: roomId,
      },
      update: {
        assignmentType: 'PRE_ASSIGNED',
        preAssignedRoomId: roomId,
        preAssignedAt: new Date(),
        finalRoomId: roomId,
      },
    });

    // Create room hold
    await tx.roomHold.create({
      data: {
        roomId,
        holdType: 'PRE_ASSIGN',
        bookingId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        expiresAt: new Date(booking.checkIn.getTime() - 4 * 60 * 60 * 1000), // 4 hours before check-in
        status: 'ACTIVE',
      },
    });

    return assignment;
  });
}

/**
 * Auto-assign a room at check-in time
 */
export async function autoAssignRoom(bookingId: string, checkInDate: Date) {
  return prisma.$transaction(async (tx) => {
    // Get booking details
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { room: true },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    // Check if room is already assigned and available
    if (booking.room.status === 'VACANT') {
      // Room is available, just update the assignment type
      const assignment = await tx.bookingRoomAssignment.upsert({
        where: { bookingId },
        create: {
          bookingId,
          assignmentType: 'AUTO_ASSIGN',
          autoAssignedRoomId: booking.roomId,
          autoAssignedAt: new Date(),
          finalRoomId: booking.roomId,
        },
        update: {
          assignmentType: 'AUTO_ASSIGN',
          autoAssignedRoomId: booking.roomId,
          autoAssignedAt: new Date(),
          finalRoomId: booking.roomId,
        },
      });

      return {
        assignment,
        room: booking.room,
        isNewAssignment: false,
      };
    }

    // Room is not available, find a new room
    const bestRoom = await findBestAvailableRoomForTx(tx, checkInDate, booking.checkOut, booking.room.type);

    if (!bestRoom) {
      throw new Error('NO_ROOM_AVAILABLE');
    }

    // Update booking with new room
    await tx.booking.update({
      where: { id: bookingId },
      data: { roomId: bestRoom.roomId },
    });

    // Create or update assignment
    const assignment = await tx.bookingRoomAssignment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        assignmentType: 'AUTO_ASSIGN',
        autoAssignedRoomId: bestRoom.roomId,
        autoAssignedAt: new Date(),
        finalRoomId: bestRoom.roomId,
      },
      update: {
        assignmentType: 'AUTO_ASSIGN',
        autoAssignedRoomId: bestRoom.roomId,
        autoAssignedAt: new Date(),
        finalRoomId: bestRoom.roomId,
      },
    });

    return {
      assignment,
      room: bestRoom,
      isNewAssignment: true,
    };
  });
}

/**
 * Internal helper to find best available room within transaction
 */
async function findBestAvailableRoomForTx(
  tx: any,
  checkIn: Date,
  checkOut: Date,
  roomType: RoomType
) {
  const rooms = await tx.room.findMany({
    where: {
      type: roomType,
      status: 'VACANT',
      cleaningStatus: 'CLEAN',
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    take: 10,
  });

  // Check each room for availability
  for (const room of rooms) {
    const conflicting = await tx.booking.findFirst({
      where: {
        roomId: room.id,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
          { checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
        ],
      },
    });

    if (!conflicting) {
      return room;
    }
  }

  return null;
}

/**
 * Reassign a room (change room before or during stay)
 */
export async function reassignRoom(
  bookingId: string,
  newRoomId: string,
  reason: string,
  initiatedById?: string
) {
  return prisma.$transaction(async (tx) => {
    // Get current booking
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { room: true },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    const oldRoomId = booking.roomId;
    const oldRoom = booking.room;

    // Get new room
    const newRoom = await tx.room.findUnique({
      where: { id: newRoomId },
    });

    if (!newRoom) {
      throw new Error('ROOM_NOT_FOUND');
    }

    if (newRoom.type !== oldRoom.type) {
      throw new Error('ROOM_TYPE_MISMATCH');
    }

    // Check new room availability
    const conflicting = await tx.booking.findFirst({
      where: {
        roomId: newRoomId,
        id: { not: bookingId },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [
          { checkIn: { lt: booking.checkOut }, checkOut: { gt: booking.checkIn } },
        ],
      },
    });

    if (conflicting) {
      throw new Error('ROOM_NOT_AVAILABLE');
    }

    // Release old room hold
    await tx.roomHold.updateMany({
      where: { bookingId, status: 'ACTIVE' },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });

    // Update booking with new room
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { roomId: newRoomId },
    });

    // Create new room hold
    await tx.roomHold.create({
      data: {
        roomId: newRoomId,
        holdType: 'BOOKING',
        bookingId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        expiresAt: new Date(booking.checkIn.getTime() - 4 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    // Update room assignment if exists
    await tx.bookingRoomAssignment.updateMany({
      where: { bookingId },
      data: { finalRoomId: newRoomId },
    });

    // Record room move history
    await tx.roomMoveHistory.create({
      data: {
        bookingId,
        fromRoomId: oldRoomId,
        toRoomId: newRoomId,
        reason: 'GUEST_REQUEST',
        effectiveFrom: new Date(),
        initiatedById,
        notes: reason,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: initiatedById,
        bookingId,
        action: 'ROOM_REASSIGNED',
        entity: 'booking',
        entityId: bookingId,
        metadata: {
          fromRoom: oldRoom.roomNumber,
          toRoom: newRoom.roomNumber,
          reason,
        },
      },
    });

    return {
      booking: updatedBooking,
      oldRoom,
      newRoom,
    };
  });
}

/**
 * Get available rooms for a room type and date range
 */
export async function getAvailableRoomsForType(
  roomType: RoomType,
  checkIn: Date,
  checkOut: Date,
  propertyId: string = 'default'
) {
  // Find rooms that are not booked for the date range
  const rooms = await prisma.room.findMany({
    where: {
      type: roomType,
      propertyId,
      status: 'VACANT',
      cleaningStatus: 'CLEAN',
      bookings: {
        none: {
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { checkIn: { lt: checkOut } },
            { checkOut: { gt: checkIn } },
          ],
        },
      },
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  });

  return rooms;
}

/**
 * Optimized room availability check using raw SQL with FOR UPDATE SKIP LOCKED
 * This is more efficient than using ORM queries for concurrent booking prevention
 */
export async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  const conflicting = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Booking" 
    WHERE "roomId" = ${roomId}
    AND status IN ('CONFIRMED', 'CHECKED_IN')
    AND ("checkIn", "checkOut") OVERLAPS (${checkIn}, ${checkOut})
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  `;
  return conflicting.length === 0;
}
