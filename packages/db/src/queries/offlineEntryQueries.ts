import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * ─── Offline Entry Queries ───────────────────────────────────────────────────
 *
 * Functions for managing offline entries that need to be synced later.
 * Scenario 73: System offline → manual entry → later sync
 */

// ─── Create ────────────────────────────────────────────────────────────────────

/**
 * Create an offline booking entry
 */
export async function createOfflineBooking(
    data: {
        guestId?: string;
        guestName: string;
        guestPhone: string;
        guestEmail?: string;
        roomId: string;
        checkIn: Date;
        checkOut: Date;
        guestsCount?: number;
        bookingType?: 'DAILY' | 'MONTHLY';
        bookingSource?: 'WEBSITE' | 'WALK_IN' | 'PHONE' | 'OTA';
        baseAmount: number;
        totalAmount: number;
        specialRequests?: string;
    },
    localId: string,
    clientTimestamp: Date,
    propertyId: string = 'default'
) {
    return prisma.offlineEntry.create({
        data: {
            localId,
            entryType: 'BOOKING',
            entryData: data as any,
            clientTimestamp,
            propertyId,
            syncStatus: 'PENDING',
        },
    });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Get pending offline entries for a property
 */
export async function getPendingOfflineEntries(
    propertyId: string = 'default',
    page: number = 1,
    perPage: number = 20
) {
    const [entries, total] = await Promise.all([
        prisma.offlineEntry.findMany({
            where: {
                propertyId,
                syncStatus: { in: ['PENDING', 'FAILED', 'CONFLICT'] },
            },
            orderBy: { clientTimestamp: 'asc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.offlineEntry.count({
            where: {
                propertyId,
                syncStatus: { in: ['PENDING', 'FAILED', 'CONFLICT'] },
            },
        }),
    ]);

    return { entries, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Get offline entry by ID
 */
export async function getOfflineEntryById(entryId: string) {
    return prisma.offlineEntry.findUnique({
        where: { id: entryId },
    });
}

/**
 * Get offline entry by local ID
 */
export async function getOfflineEntryByLocalId(localId: string, propertyId: string = 'default') {
    return prisma.offlineEntry.findUnique({
        where: {
            localId_propertyId: { localId, propertyId },
        },
    });
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

/**
 * Mark an offline entry as synced with a server booking ID
 */
export async function markOfflineEntrySynced(entryId: string, serverBookingId: string) {
    return prisma.offlineEntry.update({
        where: { id: entryId },
        data: {
            syncStatus: 'SYNCED',
            syncedAt: new Date(),
            bookingId: serverBookingId,
            syncError: null,
        },
    });
}

/**
 * Mark an offline entry as currently syncing
 */
export async function markOfflineEntrySyncing(entryId: string) {
    return prisma.offlineEntry.update({
        where: { id: entryId },
        data: {
            syncStatus: 'SYNCING',
        },
    });
}

/**
 * Mark an offline entry as failed
 */
export async function markOfflineEntryFailed(entryId: string, errorMessage: string) {
    return prisma.offlineEntry.update({
        where: { id: entryId },
        data: {
            syncStatus: 'FAILED',
            syncError: errorMessage,
        },
    });
}

/**
 * Retry sync for an offline entry
 */
export async function retryOfflineSync(entryId: string) {
    const entry = await prisma.offlineEntry.findUnique({
        where: { id: entryId },
    });

    if (!entry) {
        throw new Error('Offline entry not found');
    }

    if (entry.syncStatus === 'SYNCED') {
        throw new Error('Entry already synced');
    }

    // Reset to pending for retry
    return prisma.offlineEntry.update({
        where: { id: entryId },
        data: {
            syncStatus: 'PENDING',
            syncError: null,
        },
    });
}

// ─── Conflict Detection ──────────────────────────────────────────────────────

/**
 * Get conflicts for an offline entry
 */
export async function getOfflineEntryConflicts(entryId: string) {
    const entry = await prisma.offlineEntry.findUnique({
        where: { id: entryId },
    });

    if (!entry) {
        throw new Error('Offline entry not found');
    }

    const conflicts: Array<{
        type: string;
        description: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }> = [];

    if (entry.entryType === 'BOOKING') {
        const data = entry.entryData as any;

        // Check for room availability conflicts
        const overlapping = await prisma.booking.findFirst({
            where: {
                roomId: data.roomId,
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                OR: [
                    {
                        checkIn: { lt: new Date(data.checkOut) },
                        checkOut: { gt: new Date(data.checkIn) },
                    },
                ],
            },
            include: {
                guest: { select: { name: true, phone: true } },
                room: { select: { roomNumber: true } },
            },
        });

        if (overlapping) {
            conflicts.push({
                type: 'ROOM_AVAILABILITY',
                description: `Room ${overlapping.room.roomNumber} is already booked for ${overlapping.guest.name} (${overlapping.guest.phone}) during the requested dates`,
                severity: 'HIGH',
            });
        }

        // Check for duplicate guest (same phone)
        if (data.guestPhone) {
            const existingGuest = await prisma.guest.findFirst({
                where: { phone: data.guestPhone },
            });

            const entryDataObj = entry.entryData as Record<string, unknown> | null;
            if (existingGuest && entryDataObj?.guestId && existingGuest.id !== entryDataObj.guestId) {
                conflicts.push({
                    type: 'DUPLICATE_GUEST',
                    description: `A guest with phone ${data.guestPhone} already exists: ${existingGuest.name}`,
                    severity: 'MEDIUM',
                });
            }
        }
    }

    return {
        entryId,
        hasConflicts: conflicts.length > 0,
        conflicts,
    };
}

/**
 * Resolve an offline conflict
 */
export async function resolveOfflineConflict(
    entryId: string,
    resolution: {
        action: 'CREATE_BOOKING' | 'UPDATE_BOOKING' | 'SKIP' | 'MERGE';
        linkedBookingId?: string;
        modifiedData?: any;
    }
) {
    const entry = await prisma.offlineEntry.update({
        where: { id: entryId },
        data: {
            conflictInfo: resolution as any,
            resolvedAt: new Date(),
        },
    });

    return entry;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Delete old synced entries (cleanup)
 */
export async function cleanupSyncedEntries(olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    return prisma.offlineEntry.deleteMany({
        where: {
            syncStatus: 'SYNCED',
            syncedAt: { lt: cutoffDate },
        },
    });
}
