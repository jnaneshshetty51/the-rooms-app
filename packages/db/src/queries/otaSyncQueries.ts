// packages/db/src/queries/otaSyncQueries.ts
// OTA Sync Failure Handling Queries

import prisma from '../index';
import { SyncStatus, SyncType, SyncDirection } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SyncFailureFilters = {
    channelId?: string;
    startDate?: Date;
    endDate?: Date;
    syncType?: SyncType;
    status?: SyncStatus;
    page?: number;
    perPage?: number;
};

export type SyncHealth = {
    channelId: string;
    channelName: string;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    partialFailures: number;
    averageDurationMs: number | null;
    lastSyncAt: Date | null;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
    successRate: number;
    healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
};

// ── Sync Failure Logging ──────────────────────────────────────────────────────

/**
 * Log a sync failure to the SyncLog table
 */
export async function logSyncFailure(
    channelId: string,
    syncType: SyncType,
    error: string,
    details?: Record<string, unknown>
) {
    return prisma.syncLog.updateMany({
        where: {
            channelId,
            syncType,
            status: 'IN_PROGRESS',
        },
        data: {
            status: 'FAILED',
            errorMessage: error,
            errorDetails: details as any,
            completedAt: new Date(),
        },
    });
}

/**
 * Create a new sync failure log entry
 */
export async function createSyncFailureLog(
    channelId: string,
    syncType: SyncType,
    syncDirection: SyncDirection,
    error: string,
    details?: Record<string, unknown>,
    requestPayload?: Record<string, unknown>
) {
    return prisma.syncLog.create({
        data: {
            channelId,
            syncType,
            syncDirection,
            status: 'FAILED',
            errorMessage: error,
            errorDetails: details as any,
            requestPayload: requestPayload as any,
            startedAt: new Date(),
            completedAt: new Date(),
        },
    });
}

// ── Sync Failures Retrieval ────────────────────────────────────────────────────

/**
 * Get sync failures with filters and pagination
 */
export async function getSyncFailures(filters: SyncFailureFilters = {}) {
    const {
        channelId,
        startDate,
        endDate,
        syncType,
        status = 'FAILED',
        page = 1,
        perPage = 20,
    } = filters;

    const where: any = {};
    if (channelId) where.channelId = channelId;
    if (syncType) where.syncType = syncType;
    if (status) where.status = status;

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const [failures, total] = await Promise.all([
        prisma.syncLog.findMany({
            where,
            include: {
                channel: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.syncLog.count({ where }),
    ]);

    return {
        failures,
        total,
        pages: Math.ceil(total / perPage),
        page,
    };
}

/**
 * Get a specific sync log by ID
 */
export async function getSyncLogById(syncLogId: string) {
    return prisma.syncLog.findUnique({
        where: { id: syncLogId },
        include: {
            channel: {
                select: {
                    id: true,
                    name: true,
                    displayName: true,
                    isActive: true,
                },
            },
        },
    });
}

// ── Sync Retry ────────────────────────────────────────────────────────────────

/**
 * Retry a failed sync by creating a new pending sync log
 */
export async function retrySync(syncLogId: string) {
    const originalLog = await prisma.syncLog.findUnique({
        where: { id: syncLogId },
        include: { channel: true },
    });

    if (!originalLog) {
        throw new Error('Sync log not found');
    }

    if (originalLog.status !== 'FAILED') {
        throw new Error('Only failed syncs can be retried');
    }

    // Create a new sync log entry for the retry
    return prisma.syncLog.create({
        data: {
            channelId: originalLog.channelId,
            syncType: originalLog.syncType,
            syncDirection: originalLog.syncDirection,
            status: 'PENDING',
            itemsTotal: 0,
            itemsSynced: 0,
            itemsFailed: 0,
            requestPayload: originalLog.requestPayload as any,
        },
    });
}

// ── Sync Health ────────────────────────────────────────────────────────────────

/**
 * Get sync health metrics for a channel or all channels
 */
export async function getSyncHealth(channelId?: string) {
    const whereClause = channelId ? { channelId } : {};

    // Get all syncs in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [channels, allSyncs] = await Promise.all([
        channelId
            ? prisma.channel.findMany({
                where: { id: channelId },
                select: { id: true, name: true, displayName: true },
            })
            : prisma.channel.findMany({
                select: { id: true, name: true, displayName: true },
            }),
        prisma.syncLog.findMany({
            where: {
                ...whereClause,
                createdAt: { gte: thirtyDaysAgo },
            },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    // Calculate health metrics per channel
    const healthByChannel: SyncHealth[] = channels.map((channel) => {
        const channelSyncs = allSyncs.filter((s) => s.channelId === channel.id);
        const totalSyncs = channelSyncs.length;
        const successfulSyncs = channelSyncs.filter((s) => s.status === 'COMPLETED').length;
        const failedSyncs = channelSyncs.filter((s) => s.status === 'FAILED').length;
        const partialFailures = channelSyncs.filter((s) => s.status === 'PARTIAL_FAILURE').length;

        const completedSyncs = channelSyncs.filter(
            (s) => s.status === 'COMPLETED' && s.durationMs !== null
        );
        const averageDurationMs =
            completedSyncs.length > 0
                ? completedSyncs.reduce((sum, s) => sum + (s.durationMs || 0), 0) / completedSyncs.length
                : null;

        const lastSync = channelSyncs[0];
        const lastSuccess = channelSyncs.find((s) => s.status === 'COMPLETED');
        const lastFailure = channelSyncs.find((s) => s.status === 'FAILED');

        const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;

        let healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
        if (successRate < 50) healthStatus = 'UNHEALTHY';
        else if (successRate < 80) healthStatus = 'DEGRADED';

        return {
            channelId: channel.id,
            channelName: channel.displayName,
            totalSyncs,
            successfulSyncs,
            failedSyncs,
            partialFailures,
            averageDurationMs,
            lastSyncAt: lastSync?.createdAt || null,
            lastSuccessAt: lastSuccess?.createdAt || null,
            lastFailureAt: lastFailure?.createdAt || null,
            successRate: Math.round(successRate * 100) / 100,
            healthStatus,
        };
    });

    // Calculate overall health
    const totalSyncs = allSyncs.length;
    const successfulSyncs = allSyncs.filter((s) => s.status === 'COMPLETED').length;
    const failedSyncs = allSyncs.filter((s) => s.status === 'FAILED').length;
    const overallSuccessRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;

    return {
        overall: {
            totalSyncs,
            successfulSyncs,
            failedSyncs,
            successRate: Math.round(overallSuccessRate * 100) / 100,
            periodStart: thirtyDaysAgo,
            periodEnd: new Date(),
        },
        byChannel: healthByChannel,
    };
}

// ── Sync Alerts ────────────────────────────────────────────────────────────────

/**
 * Create an alert for repeated sync failures
 */
export async function createSyncAlert(
    channelId: string,
    type: string,
    message: string
) {
    // Check if there's already an unacknowledged alert for this channel
    const existingAlert = await prisma.alert.findFirst({
        where: {
            title: { contains: type },
            acknowledged: false,
            createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
        },
    });

    if (existingAlert) {
        // Update existing alert instead of creating a new one
        return prisma.alert.update({
            where: { id: existingAlert.id },
            data: {
                message: `${message} (Updated at ${new Date().toISOString()})`,
            },
        });
    }

    return prisma.alert.create({
        data: {
            severity: 'WARNING',
            title: `Sync Alert: ${type}`,
            message,
        },
    });
}

/**
 * Get all sync alerts (unacknowledged)
 */
export async function getSyncAlerts(includeAcknowledged = false) {
    const where = includeAcknowledged ? {} : { acknowledged: false };

    return prisma.alert.findMany({
        where: {
            ...where,
            title: { contains: 'Sync' },
        },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Resolve a sync alert
 */
export async function resolveSyncAlert(alertId: string, resolution: string) {
    return prisma.alert.update({
        where: { id: alertId },
        data: {
            acknowledged: true,
            message: resolution,
        },
    });
}

/**
 * Get a specific alert by ID
 */
export async function getAlertById(alertId: string) {
    return prisma.alert.findUnique({
        where: { id: alertId },
    });
}

// ── Scheduled Price Sync ──────────────────────────────────────────────────────

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
 * Get scheduled syncs
 */
export async function getScheduledSyncs(channelId?: string) {
    const where: any = {
        status: 'PENDING',
        startedAt: { gte: new Date() },
    };
    if (channelId) where.channelId = channelId;

    return prisma.syncLog.findMany({
        where,
        include: {
            channel: {
                select: {
                    id: true,
                    name: true,
                    displayName: true,
                },
            },
        },
        orderBy: { startedAt: 'asc' },
    });
}