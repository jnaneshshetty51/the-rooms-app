// packages/channel-manager/src/adapters/BaseAdapter.ts
// Base adapter implementation

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
    ChannelName,
    ChannelConfig,
    ChannelCapabilities,
    ValidationResult,
    HotelInfo,
    SyncResult,
} from '../types';
import type { IChannelAdapter } from '../interfaces/IChannelAdapter';
import type { InventoryUpdate, RateUpdate } from '../types/inventory';
import type { OtaBooking, BookingUpdate } from '../types/booking';
import type { WebhookPayload } from '../types/webhook';
import { withRetry } from '../utils/retry';
import { logger, Logger, ChildLogger } from '../utils/logger';

export interface RequestOptions extends AxiosRequestConfig {
    headers?: Record<string, string>;
}

export abstract class BaseAdapter implements IChannelAdapter {
    protected config: ChannelConfig | null = null;
    protected httpClient: AxiosInstance;
    protected adapterLogger: Logger | ChildLogger;

    abstract readonly channelName: ChannelName;
    abstract readonly capabilities: ChannelCapabilities;

    constructor() {
        this.httpClient = axios.create({
            timeout: 30000,
        });
        this.adapterLogger = logger;
    }

    configure(config: ChannelConfig): void {
        this.config = config;
        this.adapterLogger = logger.child({ channelName: this.channelName });
    }

    protected getConfig(): ChannelConfig {
        if (!this.config) {
            throw new Error(`Channel ${this.channelName} not configured`);
        }
        return this.config;
    }

    async validateConfig(): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!this.config) {
            errors.push('Configuration not set');
            return { valid: false, errors, warnings };
        }

        if (!this.config.propertyId) {
            errors.push('Property ID is required');
        }

        if (!this.config.apiKey && !this.config.username) {
            errors.push('API key or username is required');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    async ping(): Promise<boolean> {
        try {
            await this.getHotelInfo();
            return true;
        } catch {
            return false;
        }
    }

    abstract getHotelInfo(): Promise<HotelInfo>;

    abstract fetchInventory(startDate: Date, endDate: Date): Promise<InventoryUpdate[]>;
    abstract pushInventory(inventory: InventoryUpdate[]): Promise<SyncResult>;
    abstract fetchRates(startDate: Date, endDate: Date): Promise<RateUpdate[]>;
    abstract pushRates(rates: RateUpdate[]): Promise<SyncResult>;
    abstract fetchBookings(since: Date): Promise<OtaBooking[]>;
    abstract pushBookingUpdate(booking: BookingUpdate): Promise<SyncResult>;
    abstract pushBookingCancel(bookingId: string, reason: string): Promise<SyncResult>;
    abstract verifyWebhookSignature(payload: string, signature: string): boolean;
    abstract parseWebhookPayload(payload: string): WebhookPayload;

    protected async makeRequest<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        options?: RequestOptions
    ): Promise<T> {
        const config = this.getConfig();
        const url = config.endpoint ? `${config.endpoint}${endpoint}` : endpoint;

        const requestConfig: AxiosRequestConfig = {
            method,
            url,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        };

        // Add auth headers
        if (config.apiKey) {
            requestConfig.headers = {
                ...requestConfig.headers,
                'X-API-Key': config.apiKey,
            };
        }

        if (config.username && config.password) {
            requestConfig.auth = {
                username: config.username,
                password: config.password,
            };
        }

        const result = await withRetry(() => this.httpClient.request<T>(requestConfig), {
            maxRetries: 3,
            initialDelayMs: 1000,
        });

        if (!result.success) {
            throw result.error;
        }

        return result.result!.data;
    }

    protected signRequest(payload: string): string {
        // Override in subclasses for channel-specific signing
        return '';
    }

    protected buildSyncResult(
        success: boolean,
        itemsSynced: number,
        itemsFailed: number,
        errors: { itemId: string; error: string }[],
        startTime: number
    ): SyncResult {
        return {
            success,
            itemsSynced,
            itemsFailed,
            errors: errors.map((e) => ({
                itemId: e.itemId,
                itemType: 'room',
                errorCode: 'SYNC_ERROR',
                errorMessage: e.error,
                retryable: true,
            })),
            durationMs: Date.now() - startTime,
            timestamp: new Date(),
        };
    }
}
