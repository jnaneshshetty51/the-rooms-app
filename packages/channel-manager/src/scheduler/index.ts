// packages/channel-manager/src/scheduler/index.ts
// Sync scheduler for background jobs

import { ChannelManager } from '../core/ChannelManager';
import { channelRegistry } from '../core/ChannelRegistry';
import { BookingComAdapter } from '../channels/booking-com';
import { AirbnbAdapter } from '../channels/airbnb';
import { ExpediaAdapter } from '../channels/expedia';
import { AgodaAdapter } from '../channels/agoda';
import { logger } from '../utils/logger';
import type { SyncResult } from '../types';
import { ChannelName, SyncType } from '../types/channel';

export interface SyncSchedule {
    channelId: string;
    channelName: ChannelName;
    syncType: SyncType;
    intervalMinutes: number;
    enabled: boolean;
    lastSyncAt?: Date;
    nextSyncAt?: Date;
}

export interface SchedulerConfig {
    schedules: SyncSchedule[];
    defaultIntervalMinutes: number;
    maxConcurrentSyncs: number;
}

export class SyncScheduler {
    private schedules: Map<string, SyncSchedule> = new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();
    private channelManager: ChannelManager;
    private schedulerLogger: typeof logger;
    private isRunning: boolean = false;
    private maxConcurrentSyncs: number;
    private currentlyRunning: Set<string> = new Set();

    constructor(channelManager: ChannelManager, config?: Partial<SchedulerConfig>) {
        this.channelManager = channelManager;
        this.schedulerLogger = logger;
        this.maxConcurrentSyncs = config?.maxConcurrentSyncs ?? 3;

        // Register default adapters if not already registered
        this.registerDefaultAdapters();

        // Initialize schedules
        if (config?.schedules) {
            for (const schedule of config.schedules) {
                this.addSchedule(schedule);
            }
        }
    }

    private registerDefaultAdapters(): void {
        // Register adapters if not already registered
        try {
            channelRegistry.register(ChannelName.BOOKING_COM, BookingComAdapter);
            channelRegistry.register(ChannelName.AIRBNB, AirbnbAdapter);
            channelRegistry.register(ChannelName.EXPEDIA, ExpediaAdapter);
            channelRegistry.register(ChannelName.AGODA, AgodaAdapter);
        } catch (error) {
            // Adapters may already be registered
            this.schedulerLogger.info('Adapters already registered or registration failed');
        }
    }

    addSchedule(schedule: SyncSchedule): void {
        this.schedules.set(schedule.channelId, schedule);
        this.schedulerLogger.info(`Schedule added: ${schedule.channelId}`);
    }

    removeSchedule(channelId: string): void {
        this.stopSchedule(channelId);
        this.schedules.delete(channelId);
        this.schedulerLogger.info(`Schedule removed: ${channelId}`);
    }

    updateSchedule(channelId: string, updates: Partial<SyncSchedule>): void {
        const schedule = this.schedules.get(channelId);
        if (schedule) {
            const updated = { ...schedule, ...updates };
            this.schedules.set(channelId, updated);

            // Restart if running
            if (this.timers.has(channelId)) {
                this.stopSchedule(channelId);
                if (updated.enabled) {
                    this.startSchedule(channelId);
                }
            }
        }
    }

    startSchedule(channelId: string): void {
        const schedule = this.schedules.get(channelId);
        if (!schedule || !schedule.enabled) {
            return;
        }

        // Clear existing timer
        if (this.timers.has(channelId)) {
            clearInterval(this.timers.get(channelId)!);
        }

        // Run immediately, then schedule
        this.runSync(channelId).catch((error) => {
            this.schedulerLogger.error(`Initial sync failed for ${channelId}: ${error}`);
        });

        // Schedule recurring sync
        const intervalMs = schedule.intervalMinutes * 60 * 1000;
        const timer = setInterval(() => {
            this.runSync(channelId).catch((error) => {
                this.schedulerLogger.error(`Scheduled sync failed for ${channelId}: ${error}`);
            });
        }, intervalMs);

        this.timers.set(channelId, timer);
        this.schedulerLogger.info(`Schedule started: ${channelId}, interval: ${intervalMs}ms`);
    }

    stopSchedule(channelId: string): void {
        const timer = this.timers.get(channelId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(channelId);
            this.schedulerLogger.info(`Schedule stopped: ${channelId}`);
        }
    }

    startAll(): void {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        this.schedulerLogger.info('Starting all sync schedules');

        for (const [channelId, schedule] of this.schedules) {
            if (schedule.enabled) {
                this.startSchedule(channelId);
            }
        }
    }

    stopAll(): void {
        this.isRunning = false;
        this.schedulerLogger.info('Stopping all sync schedules');

        for (const channelId of this.schedules.keys()) {
            this.stopSchedule(channelId);
        }
    }

    async runSync(channelId: string): Promise<SyncResult | undefined> {
        // Check concurrent sync limit
        if (this.currentlyRunning.size >= this.maxConcurrentSyncs) {
            this.schedulerLogger.warn(`Sync skipped for ${channelId} - max concurrent syncs reached`);
            return undefined;
        }

        const schedule = this.schedules.get(channelId);
        if (!schedule || !schedule.enabled) {
            return undefined;
        }

        // Mark as running
        this.currentlyRunning.add(channelId);
        const startTime = Date.now();

        try {
            this.schedulerLogger.info(`Starting sync for ${channelId}, type: ${schedule.syncType}`);

            // Execute sync via ChannelManager
            const result = await this.channelManager.executeSync(channelId, schedule.syncType);

            // Update schedule
            const now = new Date();
            const nextSync = new Date(now.getTime() + schedule.intervalMinutes * 60 * 1000);
            this.schedules.set(channelId, {
                ...schedule,
                lastSyncAt: now,
                nextSyncAt: nextSync,
            });

            this.schedulerLogger.info(`Sync completed for ${channelId}, duration: ${Date.now() - startTime}ms`);
            return result;
        } catch (error) {
            this.schedulerLogger.error(`Sync failed for ${channelId}: ${error}`);
            return {
                success: false,
                itemsSynced: 0,
                itemsFailed: 0,
                errors: [{
                    itemId: channelId,
                    itemType: 'room',
                    errorCode: 'SYNC_FAILED',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    retryable: true,
                }],
                durationMs: Date.now() - startTime,
                timestamp: new Date(),
            };
        } finally {
            this.currentlyRunning.delete(channelId);
        }
    }

    getSchedule(channelId: string): SyncSchedule | undefined {
        return this.schedules.get(channelId);
    }

    getAllSchedules(): SyncSchedule[] {
        return Array.from(this.schedules.values());
    }

    getStatus(): {
        isRunning: boolean;
        schedules: number;
        running: number;
        queued: number;
    } {
        return {
            isRunning: this.isRunning,
            schedules: this.schedules.size,
            running: this.currentlyRunning.size,
            queued: this.schedules.size - this.currentlyRunning.size,
        };
    }
}

// Default schedule configurations
export const DEFAULT_SCHEDULES: Omit<SyncSchedule, 'channelId'>[] = [
    {
        channelName: ChannelName.BOOKING_COM,
        syncType: SyncType.FULL_INVENTORY,
        intervalMinutes: 60,
        enabled: false,
    },
    {
        channelName: ChannelName.AIRBNB,
        syncType: SyncType.FULL_INVENTORY,
        intervalMinutes: 60,
        enabled: false,
    },
    {
        channelName: ChannelName.EXPEDIA,
        syncType: SyncType.FULL_INVENTORY,
        intervalMinutes: 60,
        enabled: false,
    },
    {
        channelName: ChannelName.AGODA,
        syncType: SyncType.FULL_INVENTORY,
        intervalMinutes: 60,
        enabled: false,
    },
];
