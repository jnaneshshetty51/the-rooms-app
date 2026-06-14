import prisma from '../index';
import { Room, RoomType, RoomStatus, CleaningStatus } from '@prisma/client';

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
  notes?: string
) {
  return prisma.room.update({
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
}

/**
 * Mark room as dirty (manual trigger)
 */
export async function markRoomAsDirty(roomId: string, notes?: string) {
  return prisma.room.update({
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
