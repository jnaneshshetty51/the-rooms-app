// packages/channel-manager/src/types/channel.ts
// Channel-specific type definitions

export enum ChannelName {
    BOOKING_COM = 'BOOKING_COM',
    EXPEDIA = 'EXPEDIA',
    AIRBNB = 'AIRBNB',
    AGODA = 'AGODA',
}

export enum SyncMode {
    PUSH_BASED = 'PUSH_BASED',
    PULL_BASED = 'PULL_BASED',
    WEBHOOK_BASED = 'WEBHOOK_BASED',
    HYBRID = 'HYBRID',
}

export enum ConflictStrategy {
    PMS_WINS = 'PMS_WINS',
    OTA_WINS = 'OTA_WINS',
    NEWEST_WINS = 'NEWEST_WINS',
    MANUAL = 'MANUAL',
}

export enum SyncType {
    FULL_INVENTORY = 'FULL_INVENTORY',
    INCREMENTAL_INVENTORY = 'INCREMENTAL_INVENTORY',
    RATE_UPDATE = 'RATE_UPDATE',
    BOOKING_IMPORT = 'BOOKING_IMPORT',
    BOOKING_UPDATE = 'BOOKING_UPDATE',
    BOOKING_CANCEL = 'BOOKING_CANCEL',
}

export enum SyncDirection {
    OUTBOUND = 'OUTBOUND',
    INBOUND = 'INBOUND',
}

export enum SyncStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    PARTIAL_FAILURE = 'PARTIAL_FAILURE',
}

export enum OtaSyncStatus {
    SYNCED = 'SYNCED',
    PENDING_UPDATE = 'PENDING_UPDATE',
    PENDING_CANCEL = 'PENDING_CANCEL',
    CONFLICT = 'CONFLICT',
    FAILED = 'FAILED',
}

export enum WebhookStatus {
    RECEIVED = 'RECEIVED',
    VALIDATED = 'VALIDATED',
    PROCESSING = 'PROCESSING',
    PROCESSED = 'PROCESSED',
    FAILED = 'FAILED',
}

export enum RateType {
    SINGLE = 'SINGLE',
    DOUBLE = 'DOUBLE',
    MONTHLY = 'MONTHLY',
}

export interface ChannelConfig {
    apiKey?: string;
    apiSecret?: string;
    propertyId: string;
    hotelId?: string;
    username?: string;
    password?: string;
    endpoint?: string;
    webhookSecret?: string;
}

export interface HotelInfo {
    hotelId: string;
    name: string;
    address?: string;
    timezone: string;
    currency: string;
    roomCount: number;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface ChannelCapabilities {
    supportsRealTimePush: boolean;
    supportsRealTimePull: boolean;
    supportsWebhook: boolean;
    supportsXML: boolean;
    supportsJSON: boolean;
    maxBatchSize: number;
    rateLimitPerHour: number;
}
