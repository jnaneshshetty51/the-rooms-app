// packages/channel-manager/src/types/inventory.ts
// Inventory and rate type definitions

export interface InventoryUpdate {
    roomId: string;
    otaRoomTypeId: string;
    date: Date;
    availableRooms: number;
    totalRooms: number;
    status: 'AVAILABLE' | 'SOLD_OUT' | 'ON_REQUEST';
}

export interface RateUpdate {
    roomId: string;
    otaRoomTypeId: string;
    otaRatePlanId: string;
    date: Date;
    rateSingle: number;
    rateDouble: number;
    rateMonthly?: number;
    currency: string;
    minStay: number;
    maxStay?: number;
    closedToArrival: boolean;
    closedToDeparture: boolean;
}

export interface InventoryConflict {
    roomId: string;
    date: Date;
    pmsValue: InventoryUpdate;
    otaValue: InventoryUpdate;
    resolution: 'PMS_WINS' | 'OTA_WINS' | 'NEWEST_WINS' | 'MANUAL';
    resolvedValue?: InventoryUpdate;
    resolvedAt?: Date;
    resolvedBy?: string;
}

export interface InventorySyncOptions {
    channelId: string;
    propertyId: string;
    startDate: Date;
    endDate: Date;
    syncType: 'FULL' | 'INCREMENTAL';
    forceOverwrite: boolean;
}
