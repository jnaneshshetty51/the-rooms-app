// packages/channel-manager/src/core/ChannelManager.ts
// Main channel orchestration

import type { ChannelName, SyncResult } from '../types';
import type { SyncType } from '../types/channel';
import { SyncEngine, SyncOptions } from './SyncEngine';
import { channelRegistry } from './ChannelRegistry';
import { logger, ChildLogger } from '../utils/logger';
// @ts-ignore - workspace dependency
import { db } from '@the-rooms/db';

export class ChannelManager {
    private syncEngine: SyncEngine;
    private managerLogger: ChildLogger;

    constructor() {
        this.syncEngine = new SyncEngine();
        this.managerLogger = logger.child({ component: 'ChannelManager' });
    }

    async executeSync(
        channelId: string,
        syncType: SyncType,
        options?: SyncOptions
    ): Promise<SyncResult> {
        this.managerLogger.info('Executing sync', { channelId, syncType });

        switch (syncType) {
            case 'FULL_INVENTORY':
                return this.syncEngine.executeFullSync(channelId, options);
            case 'INCREMENTAL_INVENTORY':
                return this.syncEngine.executeIncrementalSync(channelId);
            case 'BOOKING_IMPORT':
                return this.syncEngine.importBookingsFromChannel(channelId, options?.startDate) as unknown as SyncResult;
            default:
                throw new Error(`Unsupported sync type: ${syncType}`);
        }
    }

    async syncAllChannels(syncType: 'FULL' | 'INCREMENTAL'): Promise<Map<string, SyncResult>> {
        const results = new Map<string, SyncResult>();

        const channels = await db.channel.findMany({
            where: { isActive: true },
        });

        for (const channel of channels) {
            try {
                const result = syncType === 'FULL'
                    ? await this.syncEngine.executeFullSync(channel.id)
                    : await this.syncEngine.executeIncrementalSync(channel.id);
                results.set(channel.id, result);
            } catch (error) {
                this.managerLogger.error(`Sync failed for channel ${channel.id}`, error as Error);
                results.set(channel.id, {
                    success: false,
                    itemsSynced: 0,
                    itemsFailed: 0,
                    errors: [{
                        itemId: channel.id,
                        itemType: 'room',
                        errorCode: 'SYNC_FAILED',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        retryable: true,
                    }],
                    durationMs: 0,
                    timestamp: new Date(),
                });
            }
        }

        return results;
    }

    async pushInventoryUpdate(propertyId: string, roomId: string): Promise<void> {
        this.managerLogger.info('Pushing inventory update', { propertyId, roomId });

        const channels = await db.channel.findMany({
            where: { isActive: true },
        });

        for (const channel of channels) {
            try {
                await this.syncEngine.executeIncrementalSync(channel.id);
            } catch (error) {
                this.managerLogger.error(`Push update failed for channel ${channel.id}`, error as Error);
            }
        }
    }

    async pushBookingUpdate(bookingId: string): Promise<SyncResult> {
        return this.syncEngine.pushBookingUpdate(bookingId);
    }

    async testConnection(channelId: string): Promise<{ success: boolean; message: string }> {
        try {
            const channel = await db.channel.findUnique({ where: { id: channelId } });
            if (!channel) {
                return { success: false, message: 'Channel not found' };
            }

            const adapter = channelRegistry.get(channel.name as ChannelName);
            if (!adapter) {
                return { success: false, message: 'Channel adapter not available' };
            }

            const config = channel.config as { apiKey?: string; username?: string; propertyId: string };
            adapter.configure({
                apiKey: config?.apiKey,
                username: config?.username,
                propertyId: config?.propertyId,
            });

            const isValid = await adapter.validateConfig();
            if (!isValid.valid) {
                return { success: false, message: isValid.errors.join(', ') };
            }

            const canConnect = await adapter.ping();
            if (!canConnect) {
                return { success: false, message: 'Failed to connect to channel API' };
            }

            return { success: true, message: 'Connection successful' };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    getRegisteredChannels(): ChannelName[] {
        return channelRegistry.getRegisteredChannels();
    }

    getActiveChannels(): ChannelName[] {
        return channelRegistry.getActiveChannels();
    }
}
