// packages/channel-manager/src/channels/airbnb.ts
// Airbnb adapter implementation

import { BaseAdapter } from '../adapters/BaseAdapter';
import { ChannelName } from '../types/channel';
import type { ChannelConfig, ChannelCapabilities, SyncResult } from '../types';
import type { InventoryUpdate, RateUpdate } from '../types/inventory';
import type { OtaBooking, BookingUpdate } from '../types/booking';
import type { WebhookPayload } from '../types/webhook';
import { logger } from '../utils/logger';
import { verifyHmacSignature } from '../utils/signature';

interface AirbnbListing {
    id: string;
    name: string;
    property_type: string;
    bedrooms: number;
    bathrooms: number;
    accommodates: number;
    address: {
        street_address: string;
        city: string;
        state: string;
        country: string;
        postal_code: string;
    };
    currency: string;
    timezone: string;
}

interface AirbnbReservation {
    id: string;
    confirmation_code: string;
    guest: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    };
    listing_id: string;
    start_date: string;
    end_date: string;
    status: string;
    nightly_price: number;
    total_price: number;
    currency: string;
    created_at: string;
    updated_at: string;
    special_requests?: string;
}

interface AirbnbCalendar {
    listing_id: string;
    dates: Array<{
        date: string;
        available: boolean;
        daily_price: number;
        min_nights: number;
        max_nights: number;
    }>;
}

export class AirbnbAdapter extends BaseAdapter {
    readonly channelName: ChannelName = ChannelName.AIRBNB;

    readonly capabilities: ChannelCapabilities = {
        supportsRealTimePush: true,
        supportsRealTimePull: true,
        supportsWebhook: true,
        supportsXML: false,
        supportsJSON: true,
        maxBatchSize: 100,
        rateLimitPerHour: 1000,
    };

    private airbnbLogger = logger.child({ channel: 'AIRBNB' });

    async getHotelInfo(): Promise<{
        hotelId: string;
        name: string;
        address: string;
        timezone: string;
        currency: string;
        roomCount: number;
    }> {
        const listings = await this.fetchListings();

        if (listings.length === 0) {
            throw new Error('No listings found for this property');
        }

        // For multi-listing properties, aggregate the first listing info
        const primaryListing = listings[0];

        return {
            hotelId: primaryListing.id,
            name: primaryListing.name,
            address: this.formatAddress(primaryListing.address),
            timezone: primaryListing.timezone,
            currency: primaryListing.currency,
            roomCount: listings.length,
        };
    }

    async fetchListings(): Promise<AirbnbListing[]> {
        const response = await this.makeRequest<{ listings: AirbnbListing[] }>(
            'GET',
            '/listings'
        );
        return response.listings;
    }

    async fetchInventory(startDate: Date, endDate: Date): Promise<InventoryUpdate[]> {
        const listings = await this.fetchListings();
        const inventory: InventoryUpdate[] = [];

        for (const listing of listings) {
            const calendar = await this.fetchCalendar(listing.id, startDate, endDate);

            for (const dateEntry of calendar.dates) {
                inventory.push({
                    roomId: listing.id,
                    otaRoomTypeId: listing.id,
                    date: new Date(dateEntry.date),
                    availableRooms: dateEntry.available ? 1 : 0,
                    totalRooms: 1,
                    status: dateEntry.available ? 'AVAILABLE' : 'SOLD_OUT',
                });
            }
        }

        return inventory;
    }

    async fetchCalendar(listingId: string, startDate: Date, endDate: Date): Promise<AirbnbCalendar> {
        const response = await this.makeRequest<AirbnbCalendar>(
            'GET',
            `/listings/${listingId}/calendar?start_date=${this.formatDate(startDate)}&end_date=${this.formatDate(endDate)}`
        );
        return response;
    }

    async pushInventory(inventory: InventoryUpdate[]): Promise<SyncResult> {
        const startTime = Date.now();
        const errors: { itemId: string; error: string }[] = [];
        let itemsSynced = 0;

        // Group inventory by listing
        const byListing = this.groupByOtaRoomTypeId(inventory);

        for (const [listingId, updates] of Object.entries(byListing)) {
            try {
                // Airbnb requires individual date updates
                for (const update of updates) {
                    await this.updateListingAvailability(
                        listingId,
                        update.date,
                        update.availableRooms > 0,
                        update.status === 'AVAILABLE'
                    );
                    itemsSynced++;
                }
            } catch (error) {
                errors.push({
                    itemId: listingId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return this.buildSyncResult(
            errors.length === 0,
            itemsSynced,
            inventory.length - itemsSynced,
            errors,
            startTime
        );
    }

    private async updateListingAvailability(
        listingId: string,
        date: Date,
        available: boolean,
        isAvailable: boolean
    ): Promise<void> {
        await this.makeRequest<void>(
            'PUT',
            `/listings/${listingId}/availability`,
            {
                data: JSON.stringify({
                    date: this.formatDate(date),
                    available: available && isAvailable,
                }),
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }

    async fetchRates(startDate: Date, endDate: Date): Promise<RateUpdate[]> {
        const listings = await this.fetchListings();
        const rates: RateUpdate[] = [];

        for (const listing of listings) {
            const calendar = await this.fetchCalendar(listing.id, startDate, endDate);

            for (const dateEntry of calendar.dates) {
                rates.push({
                    roomId: listing.id,
                    otaRoomTypeId: listing.id,
                    otaRatePlanId: 'default',
                    date: new Date(dateEntry.date),
                    rateSingle: dateEntry.daily_price,
                    rateDouble: dateEntry.daily_price,
                    currency: listing.currency,
                    minStay: dateEntry.min_nights,
                    maxStay: dateEntry.max_nights,
                    closedToArrival: false,
                    closedToDeparture: false,
                });
            }
        }

        return rates;
    }

    async pushRates(rates: RateUpdate[]): Promise<SyncResult> {
        const startTime = Date.now();
        const errors: { itemId: string; error: string }[] = [];
        let itemsSynced = 0;

        // Group rates by listing
        const byListing = this.groupByOtaRoomTypeId(rates);

        for (const [listingId, updates] of Object.entries(byListing)) {
            try {
                for (const update of updates) {
                    await this.updateListingPrice(
                        listingId,
                        update.date,
                        update.rateSingle
                    );
                    itemsSynced++;
                }
            } catch (error) {
                errors.push({
                    itemId: listingId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return this.buildSyncResult(
            errors.length === 0,
            itemsSynced,
            rates.length - itemsSynced,
            errors,
            startTime
        );
    }

    private async updateListingPrice(listingId: string, date: Date, price: number): Promise<void> {
        await this.makeRequest<void>(
            'PUT',
            `/listings/${listingId}/pricing`,
            {
                data: JSON.stringify({
                    date: this.formatDate(date),
                    daily_price: price,
                }),
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }

    async fetchBookings(since: Date): Promise<OtaBooking[]> {
        const response = await this.makeRequest<{ reservations: AirbnbReservation[] }>(
            'GET',
            `/reservations?filter=active&updated_after=${since.toISOString()}`
        );

        return response.reservations.map((r) => this.mapReservation(r));
    }

    async pushBookingUpdate(booking: BookingUpdate): Promise<SyncResult> {
        const startTime = Date.now();

        try {
            // Map PMS status to Airbnb status
            const status = this.mapStatusToAirbnb(booking.status);

            await this.makeRequest<void>(
                'POST',
                `/reservations/${booking.otaBookingId}`,
                {
                    data: JSON.stringify({ status }),
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            return {
                success: true,
                itemsSynced: 1,
                itemsFailed: 0,
                errors: [],
                durationMs: Date.now() - startTime,
                timestamp: new Date(),
            };
        } catch (error) {
            return {
                success: false,
                itemsSynced: 0,
                itemsFailed: 1,
                errors: [{
                    itemId: booking.otaBookingId,
                    itemType: 'booking',
                    errorCode: 'BOOKING_UPDATE_FAILED',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    retryable: true,
                }],
                durationMs: Date.now() - startTime,
                timestamp: new Date(),
            };
        }
    }

    async pushBookingCancel(bookingId: string, reason: string): Promise<SyncResult> {
        const startTime = Date.now();

        try {
            await this.makeRequest<void>(
                'POST',
                `/reservations/${bookingId}/cancellation`,
                {
                    data: JSON.stringify({ reason }),
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            return {
                success: true,
                itemsSynced: 1,
                itemsFailed: 0,
                errors: [],
                durationMs: Date.now() - startTime,
                timestamp: new Date(),
            };
        } catch (error) {
            return {
                success: false,
                itemsSynced: 0,
                itemsFailed: 1,
                errors: [{
                    itemId: bookingId,
                    itemType: 'booking',
                    errorCode: 'BOOKING_CANCEL_FAILED',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    retryable: true,
                }],
                durationMs: Date.now() - startTime,
                timestamp: new Date(),
            };
        }
    }

    verifyWebhookSignature(payload: string, signature: string): boolean {
        const config = this.getConfig();
        if (!config.webhookSecret) {
            this.airbnbLogger.warn('No webhook secret configured');
            return false;
        }

        // Airbnb uses HMAC-SHA256 signatures (base64 encoded)
        return verifyHmacSignature(payload, signature, config.webhookSecret);
    }

    parseWebhookPayload(payload: string): WebhookPayload {
        const data = JSON.parse(payload);

        return {
            eventType: data.event_type,
            eventId: data.reservation_id,
            timestamp: new Date(data.created_at),
            data: data,
        };
    }

    // Helper methods
    private formatAddress(address: AirbnbListing['address']): string {
        const parts = [
            address.street_address,
            address.city,
            address.state,
            address.country,
        ].filter(Boolean);
        return parts.join(', ');
    }

    private mapReservation(r: AirbnbReservation): OtaBooking {
        return {
            otaBookingId: r.id,
            otaReference: r.confirmation_code,
            guestName: `${r.guest.first_name} ${r.guest.last_name}`,
            guestEmail: r.guest.email,
            guestPhone: r.guest.phone,
            checkIn: new Date(r.start_date),
            checkOut: new Date(r.end_date),
            roomTypeId: r.listing_id,
            roomTypeName: '', // Airbnb doesn't provide this directly
            totalAmount: r.total_price,
            currency: r.currency,
            status: this.mapStatus(r.status),
            specialRequests: r.special_requests,
            createdAt: new Date(r.created_at),
            updatedAt: new Date(r.updated_at),
        };
    }

    private mapStatus(status: string): OtaBooking['status'] {
        const statusMap: Record<string, OtaBooking['status']> = {
            'accepted': 'CONFIRMED',
            'cancelled': 'CANCELLED',
            'denied': 'CANCELLED',
            'expired': 'CANCELLED',
        };
        return statusMap[status] ?? 'CONFIRMED';
    }

    private mapStatusToAirbnb(status: BookingUpdate['status']): string {
        const statusMap: Record<BookingUpdate['status'], string> = {
            'CONFIRMED': 'accepted',
            'CHECKED_IN': 'checked_in',
            'CHECKED_OUT': 'checked_out',
            'CANCELLED': 'cancelled',
        };
        return statusMap[status] ?? 'accepted';
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    private groupByOtaRoomTypeId<T extends { otaRoomTypeId: string }>(
        items: T[]
    ): Record<string, T[]> {
        return items.reduce((acc, item) => {
            if (!acc[item.otaRoomTypeId]) {
                acc[item.otaRoomTypeId] = [];
            }
            acc[item.otaRoomTypeId].push(item);
            return acc;
        }, {} as Record<string, T[]>);
    }
}
