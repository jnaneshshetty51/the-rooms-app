// packages/channel-manager/src/interfaces/IChannelAdapter.ts
// Base channel adapter interface

import type {
    ChannelName,
    ChannelConfig,
    ChannelCapabilities,
    ValidationResult,
    HotelInfo,
    SyncResult,
} from '../types';
import type { InventoryUpdate, RateUpdate } from '../types/inventory';
import type { OtaBooking, BookingUpdate } from '../types/booking';
import type { WebhookPayload } from '../types/webhook';

export interface IChannelAdapter {
    // Channel identification
    readonly channelName: ChannelName;
    readonly capabilities: ChannelCapabilities;

    // Configuration
    configure(config: ChannelConfig): void;
    validateConfig(): Promise<ValidationResult>;

    // Connection test
    ping(): Promise<boolean>;
    getHotelInfo(): Promise<HotelInfo>;

    // Inventory operations
    fetchInventory(startDate: Date, endDate: Date): Promise<InventoryUpdate[]>;
    pushInventory(inventory: InventoryUpdate[]): Promise<SyncResult>;

    // Rate operations
    fetchRates(startDate: Date, endDate: Date): Promise<RateUpdate[]>;
    pushRates(rates: RateUpdate[]): Promise<SyncResult>;

    // Booking operations
    fetchBookings(since: Date): Promise<OtaBooking[]>;
    pushBookingUpdate(booking: BookingUpdate): Promise<SyncResult>;
    pushBookingCancel(bookingId: string, reason: string): Promise<SyncResult>;

    // Webhook handling
    verifyWebhookSignature(payload: string, signature: string): boolean;
    parseWebhookPayload(payload: string): WebhookPayload;
}
