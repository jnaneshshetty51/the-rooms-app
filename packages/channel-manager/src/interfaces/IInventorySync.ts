// packages/channel-manager/src/interfaces/IInventorySync.ts
// Inventory sync interface

import type { SyncResult } from '../types';
import type { InventoryUpdate, InventoryConflict, InventorySyncOptions } from '../types/inventory';

export interface IInventorySync {
    // Sync operations
    syncInventory(options: InventorySyncOptions): Promise<SyncResult>;
    fetchFromPms(startDate: Date, endDate: Date): Promise<InventoryUpdate[]>;
    fetchFromChannel(channelId: string, startDate: Date, endDate: Date): Promise<InventoryUpdate[]>;

    // Conflict detection and resolution
    detectConflicts(pmsInventory: InventoryUpdate[], channelInventory: InventoryUpdate[]): InventoryConflict[];
    resolveConflicts(conflicts: InventoryConflict[]): Promise<InventoryConflict[]>;

    // Real-time updates
    pushRealtimeUpdate(roomId: string, update: InventoryUpdate): Promise<SyncResult>;

    // Mapping
    mapRoomToChannel(roomId: string, channelId: string): Promise<string | null>;
    mapChannelToRoom(otaRoomTypeId: string, channelId: string): Promise<string | null>;
}
