// packages/db/src/queries/channelSyncQueries.ts
// Channel Manager Price Sync Queries

import prisma from '../index';
import { SyncType, SyncDirection, SyncStatus } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RateSyncData = {
    roomTypeId: string;
    singleRate: number;
    doubleRate: number;
    monthlyRate?: number;
};

export type SyncResult = {
    syncLogId: string;
    channelId: string;
    syncType: SyncType;
    status: SyncStatus;
    itemsTotal: number;
    itemsSynced: number;
    itemsFailed: number;
    startedAt: Date;
};

// ── Price Sync ─────────────────────────────────────────────────────────────────

/**
 * Create a price sync log entry and return the sync data to be sent to the channel
 */
export async function syncPricesToChannel(
    channelId: string,
    rates: RateSyncData[]
) {
    // Create a sync log entry
    const syncLog = await prisma.syncLog.create({
        data: {
            channelId,
            syncType: 'RATE_UPDATE',
            syncDirection: 'OUTBOUND',
            status: 'IN_PROGRESS',
            itemsTotal: rates.length,
            itemsSynced: 0,
            itemsFailed: 0,
            startedAt: new Date(),
        },
    });

    // Get channel info
    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: {
            rateMappings: {
                where: { isActive: true },
            },
        },
    });

    if (!channel) {
        await prisma.syncLog.update({
            where: { id: syncLog.id },
            data: {
                status: 'FAILED',
                errorMessage: 'Channel not found',
                completedAt: new Date(),
            },
        });
        throw new Error('Channel not found');
    }

    // Process rate mappings and update last synced time
    const mappedRates = rates.map((rate) => {
        const mapping = channel.rateMappings.find(
            (m) => m.roomType === (rate.roomTypeId as any)
        );
        return {
            ...rate,
            otaRatePlanId: mapping?.otaRatePlanId,
            otaRatePlanName: mapping?.otaRatePlanName,
            mappingId: mapping?.id,
        };
    });

    // Update rate mappings with last synced time
    const mappingIds = mappedRates
        .filter((r) => r.mappingId)
        .map((r) => r.mappingId as string);

    if (mappingIds.length > 0) {
        await prisma.rateChannelMapping.updateMany({
            where: { id: { in: mappingIds } },
            data: { lastSyncedAt: new Date() },
        });
    }

    // Mark sync as completed (in a real implementation, this would be done after the API call)
    const updatedSyncLog = await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
            status: 'COMPLETED',
            itemsSynced: rates.length,
            itemsFailed: 0,
            completedAt: new Date(),
            durationMs: 0,
        },
    });

    return {
        syncLog,
        channel,
        rates: mappedRates,
        result: updatedSyncLog,
    };
}

/**
 * Get the last sync status for a channel
 */
export async function getLastSyncStatus(channelId: string) {
    const lastSync = await prisma.syncLog.findFirst({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
    });

    if (!lastSync) {
        return null;
    }

    return {
        syncId: lastSync.id,
        status: lastSync.status,
        syncType: lastSync.syncType,
        syncDirection: lastSync.syncDirection,
        itemsTotal: lastSync.itemsTotal,
        itemsSynced: lastSync.itemsSynced,
        itemsFailed: lastSync.itemsFailed,
        errorMessage: lastSync.errorMessage,
        startedAt: lastSync.startedAt,
        completedAt: lastSync.completedAt,
        durationMs: lastSync.durationMs,
    };
}

/**
 * Get sync history for a channel
 */
export async function getSyncHistory(channelId: string, limit = 20) {
    const syncs = await prisma.syncLog.findMany({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    return {
        syncs,
        count: syncs.length,
    };
}

/**
 * Schedule a price sync for a future date
 */
export async function schedulePriceSync(channelId: string, date: Date) {
    // Create a pending sync log entry for the scheduled sync
    return prisma.syncLog.create({
        data: {
            channelId,
            syncType: 'RATE_UPDATE',
            syncDirection: 'OUTBOUND',
            status: 'PENDING',
            startedAt: date,
        },
    });
}

/**
 * Bulk sync all room types for a channel
 */
export async function bulkSyncPrices(channelId: string) {
    // Get channel with all active rate mappings
    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: {
            rateMappings: {
                where: { isActive: true },
            },
            roomMappings: {
                where: { isActive: true },
            },
        },
    });

    if (!channel) {
        throw new Error('Channel not found');
    }

    // Get all rooms to sync
    const rooms = await prisma.room.findMany({
        where: {
            status: 'VACANT',
        },
        select: {
            id: true,
            roomNumber: true,
            type: true,
            basePriceSingle: true,
            basePriceDouble: true,
            monthlyPriceSingle: true,
            monthlyPriceDouble: true,
        },
    });

    // Create a bulk sync log entry
    const syncLog = await prisma.syncLog.create({
        data: {
            channelId,
            syncType: 'RATE_UPDATE',
            syncDirection: 'OUTBOUND',
            status: 'IN_PROGRESS',
            itemsTotal: rooms.length,
            itemsSynced: 0,
            itemsFailed: 0,
            startedAt: new Date(),
        },
    });

    // Build rate data for each room type
    const studioRooms = rooms.filter((r) => r.type === 'STUDIO');
    const premiumRooms = rooms.filter((r) => r.type === 'PREMIUM');

    const rates: RateSyncData[] = [];

    // Add studio rates
    if (studioRooms.length > 0) {
        const studio = studioRooms[0];
        rates.push({
            roomTypeId: 'STUDIO',
            singleRate: Number(studio.basePriceSingle),
            doubleRate: Number(studio.basePriceDouble),
            monthlyRate: studio.monthlyPriceSingle
                ? Number(studio.monthlyPriceSingle)
                : undefined,
        });
    }

    // Add premium rates
    if (premiumRooms.length > 0) {
        const premium = premiumRooms[0];
        rates.push({
            roomTypeId: 'PREMIUM',
            singleRate: Number(premium.basePriceSingle),
            doubleRate: Number(premium.basePriceDouble),
            monthlyRate: premium.monthlyPriceSingle
                ? Number(premium.monthlyPriceSingle)
                : undefined,
        });
    }

    // Update all rate mappings with last synced time
    const mappingIds = channel.rateMappings.map((m) => m.id);
    if (mappingIds.length > 0) {
        await prisma.rateChannelMapping.updateMany({
            where: { id: { in: mappingIds } },
            data: { lastSyncedAt: new Date() },
        });
    }

    // Update room mappings with last synced time
    const roomMappingIds = channel.roomMappings.map((m) => m.id);
    if (roomMappingIds.length > 0) {
        await prisma.roomChannelMapping.updateMany({
            where: { id: { in: roomMappingIds } },
            data: { lastSyncedAt: new Date() },
        });
    }

    // Mark sync as completed
    const updatedSyncLog = await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
            status: 'COMPLETED',
            itemsSynced: rates.length,
            itemsFailed: 0,
            completedAt: new Date(),
        },
    });

    return {
        syncLogId: syncLog.id,
        channelId,
        channelName: channel.displayName,
        ratesSynced: rates.length,
        roomsAffected: rooms.length,
        status: updatedSyncLog.status,
    };
}

/**
 * Get all active channels
 */
export async function getActiveChannels() {
    return prisma.channel.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            displayName: true,
            isActive: true,
            syncSettings: true,
        },
    });
}

/**
 * Get channel sync settings
 */
export async function getChannelSyncSettings(channelId: string) {
    return prisma.channelSyncSettings.findUnique({
        where: { channelId },
    });
}

/**
 * Update channel sync settings
 */
export async function updateChannelSyncSettings(
    channelId: string,
    data: {
        syncMode?: 'PUSH_BASED' | 'PULL_BASED' | 'WEBHOOK_BASED' | 'HYBRID';
        autoSyncInventory?: boolean;
        autoSyncRates?: boolean;
        autoImportBookings?: boolean;
        pushEnabled?: boolean;
        pushEndpoint?: string;
        maxRetries?: number;
        retryDelayMs?: number;
    }
) {
    return prisma.channelSyncSettings.upsert({
        where: { channelId },
        update: data,
        create: {
            channelId,
            ...data,
        },
    });
}