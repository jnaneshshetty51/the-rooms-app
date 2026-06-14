// packages/channel-manager/src/index.ts
// Public API exports for @the-rooms/channel-manager

// ── Types ─────────────────────────────────────────────────────────────────────
export * from './types';

// ── Interfaces ─────────────────────────────────────────────────────────────────
export type { IChannelAdapter } from './interfaces/IChannelAdapter';
export type { IInventorySync } from './interfaces/IInventorySync';
export type { IBookingSync } from './interfaces/IBookingSync';
export type { IWebhookHandler } from './interfaces/IWebhookHandler';

// ── Core ───────────────────────────────────────────────────────────────────────
export { ChannelManager } from './core/ChannelManager';
export { SyncEngine } from './core/SyncEngine';
export { ConflictResolver } from './core/ConflictResolver';
export { ChannelRegistry, channelRegistry } from './core/ChannelRegistry';
export type { SyncOptions } from './core/SyncEngine';
export type { ConflictType, Conflict, ConflictResolution } from './core/ConflictResolver';

// ── Adapters ───────────────────────────────────────────────────────────────────
export { BaseAdapter } from './adapters/BaseAdapter';
export type { RequestOptions } from './adapters/BaseAdapter';

// ── Channel Adapters ────────────────────────────────────────────────────────────
export { BookingComAdapter } from './channels/booking-com';

// ── Utilities ──────────────────────────────────────────────────────────────────
export { logger } from './utils/logger';
export type { LogContext, ChildLogger } from './utils/logger';
export { withRetry } from './utils/retry';
export type { RetryOptions, RetryResult } from './utils/retry';
export {
    verifyHmacSignature,
    generateHmacSignature,
    verifyHmacSha1Signature,
    parseBearerToken,
    generateApiKey,
    hashSecret,
} from './utils/signature';
export { parseXml, buildXml, extractText, extractArray } from './utils/xml-parser';
