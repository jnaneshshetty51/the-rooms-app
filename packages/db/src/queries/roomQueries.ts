import prisma from '../index';
import { Room, RoomType, RoomStatus } from '@prisma/client';

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
