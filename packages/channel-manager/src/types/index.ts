// packages/channel-manager/src/types/index.ts
// Type exports

export * from './channel';
export * from './inventory';
export * from './booking';
export * from './webhook';

export interface SyncResult {
    success: boolean;
    itemsSynced: number;
    itemsFailed: number;
    errors: SyncError[];
    durationMs: number;
    timestamp: Date;
}

export interface SyncError {
    itemId: string;
    itemType: 'room' | 'rate' | 'booking';
    errorCode: string;
    errorMessage: string;
    retryable: boolean;
}
