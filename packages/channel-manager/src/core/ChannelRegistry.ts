// packages/channel-manager/src/core/ChannelRegistry.ts
// Channel registration and factory

import type { ChannelName, ChannelConfig } from '../types';
import type { IChannelAdapter } from '../interfaces/IChannelAdapter';
import { logger } from '../utils/logger';

export class ChannelRegistry {
    private adapters: Map<ChannelName, IChannelAdapter> = new Map();
    private adapterClasses: Map<ChannelName, new () => IChannelAdapter> = new Map();

    register(channelName: ChannelName, adapterClass: new () => IChannelAdapter): void {
        this.adapterClasses.set(channelName, adapterClass);
        logger.info(`Registered channel adapter: ${channelName}`);
    }

    get(channelName: ChannelName): IChannelAdapter | null {
        // Return existing instance if available
        if (this.adapters.has(channelName)) {
            return this.adapters.get(channelName)!;
        }

        // Create new instance if class is registered
        const AdapterClass = this.adapterClasses.get(channelName);
        if (AdapterClass) {
            const adapter = new AdapterClass();
            this.adapters.set(channelName, adapter);
            return adapter;
        }

        return null;
    }

    configure(channelName: ChannelName, config: ChannelConfig): void {
        const adapter = this.get(channelName);
        if (adapter) {
            adapter.configure(config);
            logger.info(`Configured channel: ${channelName}`);
        } else {
            throw new Error(`Channel adapter not registered: ${channelName}`);
        }
    }

    has(channelName: ChannelName): boolean {
        return this.adapterClasses.has(channelName);
    }

    getRegisteredChannels(): ChannelName[] {
        return Array.from(this.adapterClasses.keys());
    }

    getActiveChannels(): ChannelName[] {
        return Array.from(this.adapters.keys());
    }
}

// Singleton instance
export const channelRegistry = new ChannelRegistry();
