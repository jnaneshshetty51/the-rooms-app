// packages/channel-manager/src/channels/agoda.ts
// Agoda adapter implementation

import { BaseAdapter } from '../adapters/BaseAdapter';
import { ChannelName } from '../types/channel';
import type { ChannelConfig, ChannelCapabilities, SyncResult } from '../types';
import type { InventoryUpdate, RateUpdate } from '../types/inventory';
import type { OtaBooking, BookingUpdate } from '../types/booking';
import type { WebhookPayload } from '../types/webhook';
import { logger } from '../utils/logger';
import { verifyHmacSignature } from '../utils/signature';

interface AgodaProperty {
    property_id: string;
    property_name: string;
    address: {
        address_line_1: string;
        address_line_2?: string;
        city_name: string;
        state_name: string;
        country_code: string;
        postal_code: string;
    };
    timezone: string;
    currency_code: string;
}

interface AgodaReservation {
    booking_id: string;
    confirmation_number: string;
    guest: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    };
    room_type_id: string;
    room_type_name: string;
    checkin_date: string;
    checkout_date: string;
    total_price: {
        amount: number;
        currency_code: string;
    };
    booking_status: string;
    created_at: string;
    updated_at: string;
    special_requests?: string;
}

interface AgodaAvailability {
    room_type_id: string;
    date: string;
    is_available: boolean;
    available_count: number;
    total_inventory: number;
}

interface AgodaRate {
    room_type_id: string;
    rate_plan_id: string;
    date: string;
    price: number;
    min_nights: number;
    max_nights: number;
    closed_to_arrival: boolean;
    closed_to_departure: boolean;
}

export class AgodaAdapter extends BaseAdapter {
    readonly channelName: ChannelName = ChannelName.AGODA;

    readonly capabilities: ChannelCapabilities = {
        supportsRealTimePush: true,
        supportsRealTimePull: true,
        supportsWebhook: true,
        supportsXML: false,
        supportsJSON: true,
        maxBatchSize: 200,
        rateLimitPerHour: 2000,
    };

    private agodaLogger = logger.child({ channel: 'AGODA' });

    async getHotelInfo(): Promise<{
        hotelId: string;
        name: string;
        address: string;
        timezone: string;
        currency: string;
        roomCount: number;
    }> {
        const response = await this.makeRequest<{ property: AgodaProperty }>(
            'GET',
            '/properties/me'
        );

        const property = response.property;

        return {
            hotelId: property.property_id,
            name: property.property_name,
            address: this.formatAddress(property.address),
            timezone: property.timezone,
            currency: property.currency_code,
            roomCount: 0,
        };
    }

    async fetchInventory(startDate: Date, endDate: Date): Promise<InventoryUpdate[]> {
        const response = await this.makeRequest<{ availability: AgodaAvailability[] }>(
            'GET',
            `/properties/${this.getConfig().propertyId}/availability`,
            {
                params: {
                    from_date: this.formatDate(startDate),
                    to_date: this.formatDate(endDate),
                },
            }
        );

        return response.availability.map((avail) => ({
            roomId: avail.room_type_id,
            otaRoomTypeId: avail.room_type_id,
            date: new Date(avail.date),
            availableRooms: avail.available_count,
            totalRooms: avail.total_inventory,
            status: avail.is_available ? 'AVAILABLE' : 'SOLD_OUT',
        }));
    }

    async pushInventory(inventory: InventoryUpdate[]): Promise<SyncResult> {
        const startTime = Date.now();
        const errors: { itemId: string; error: string }[] = [];
        let itemsSynced = 0;

        // Group by room type
        const byRoomType = this.groupByRoomId(inventory);

        for (const [roomTypeId, updates] of Object.entries(byRoomType)) {
            try {
                const payload = updates.map((update) => ({
                    date: this.formatDate(update.date),
                    available_count: update.availableRooms,
                    total_inventory: update.totalRooms,
                }));

                await this.makeRequest<void>(
                    'PUT',
                    `/properties/${this.getConfig().propertyId}/room-types/${roomTypeId}/availability`,
                    {
                        data: JSON.stringify({ availability: payload }),
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
                itemsSynced += updates.length;
            } catch (error) {
                errors.push({
                    itemId: roomTypeId,
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

    async fetchRates(startDate: Date, endDate: Date): Promise<RateUpdate[]> {
        const response = await this.makeRequest<{ rates: AgodaRate[] }>(
            'GET',
            `/properties/${this.getConfig().propertyId}/rates`,
            {
                params: {
                    from_date: this.formatDate(startDate),
                    to_date: this.formatDate(endDate),
                },
            }
        );

        return response.rates.map((rate) => ({
            roomId: rate.room_type_id,
            otaRoomTypeId: rate.room_type_id,
            otaRatePlanId: rate.rate_plan_id,
            date: new Date(rate.date),
            rateSingle: rate.price,
            rateDouble: rate.price,
            currency: 'USD',
            minStay: rate.min_nights,
            maxStay: rate.max_nights,
            closedToArrival: rate.closed_to_arrival,
            closedToDeparture: rate.closed_to_departure,
        }));
    }

    async pushRates(rates: RateUpdate[]): Promise<SyncResult> {
        const startTime = Date.now();
        const errors: { itemId: string; error: string }[] = [];
        let itemsSynced = 0;

        // Group by room type
        const byRoomType = this.groupByRoomId(rates);

        for (const [roomTypeId, updates] of Object.entries(byRoomType)) {
            try {
                const payload = updates.map((update) => ({
                    rate_plan_id: update.otaRatePlanId,
                    date: this.formatDate(update.date),
                    price: update.rateSingle,
                    min_nights: update.minStay,
                    closed_to_arrival: update.closedToArrival,
                    closed_to_departure: update.closedToDeparture,
                }));

                await this.makeRequest<void>(
                    'PUT',
                    `/properties/${this.getConfig().propertyId}/room-types/${roomTypeId}/rates`,
                    {
                        data: JSON.stringify({ rates: payload }),
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
                itemsSynced += updates.length;
            } catch (error) {
                errors.push({
                    itemId: roomTypeId,
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

    async fetchBookings(since: Date): Promise<OtaBooking[]> {
        const response = await this.makeRequest<{ bookings: AgodaReservation[] }>(
            'GET',
            `/properties/${this.getConfig().propertyId}/bookings`,
            {
                params: {
                    booking_status: 'active',
                    from_date: this.formatDate(since),
                },
            }
        );

        return response.bookings.map((r) => this.mapReservation(r));
    }

    async pushBookingUpdate(booking: BookingUpdate): Promise<SyncResult> {
        const startTime = Date.now();

        try {
            const status = this.mapStatusToAgoda(booking.status);

            await this.makeRequest<void>(
                'POST',
                `/properties/${this.getConfig().propertyId}/bookings/${booking.otaBookingId}`,
                {
                    data: JSON.stringify({ booking_status: status }),
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
                `/properties/${this.getConfig().propertyId}/bookings/${bookingId}/cancel`,
                {
                    data: JSON.stringify({ cancellation_reason: reason }),
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
            this.agodaLogger.warn('No webhook secret configured');
            return false;
        }

        return verifyHmacSignature(payload, signature, config.webhookSecret);
    }

    parseWebhookPayload(payload: string): WebhookPayload {
        const data = JSON.parse(payload);

        return {
            eventType: data.event_type,
            eventId: data.booking_id,
            timestamp: new Date(data.created_at),
            data: data,
        };
    }

    // Helper methods
    private formatAddress(address: AgodaProperty['address']): string {
        const parts = [
            address.address_line_1,
            address.address_line_2,
            address.city_name,
            address.state_name,
            address.country_code,
        ].filter(Boolean);
        return parts.join(', ');
    }

    private mapReservation(r: AgodaReservation): OtaBooking {
        return {
            otaBookingId: r.booking_id,
            otaReference: r.confirmation_number,
            guestName: `${r.guest.first_name} ${r.guest.last_name}`,
            guestEmail: r.guest.email,
            guestPhone: r.guest.phone,
            checkIn: new Date(r.checkin_date),
            checkOut: new Date(r.checkout_date),
            roomTypeId: r.room_type_id,
            roomTypeName: r.room_type_name,
            totalAmount: r.total_price.amount,
            currency: r.total_price.currency_code,
            status: this.mapStatus(r.booking_status),
            specialRequests: r.special_requests,
            createdAt: new Date(r.created_at),
            updatedAt: new Date(r.updated_at),
        };
    }

    private mapStatus(status: string): OtaBooking['status'] {
        const statusMap: Record<string, OtaBooking['status']> = {
            'CONFIRMED': 'CONFIRMED',
            'BOOKED': 'CONFIRMED',
            'CHECKED_IN': 'CONFIRMED',
            'COMPLETED': 'MODIFIED',
            'CANCELLED': 'CANCELLED',
            'NO_SHOW': 'CANCELLED',
        };
        return statusMap[status] ?? 'CONFIRMED';
    }

    private mapStatusToAgoda(status: BookingUpdate['status']): string {
        const statusMap: Record<BookingUpdate['status'], string> = {
            'CONFIRMED': 'CONFIRMED',
            'CHECKED_IN': 'CHECKED_IN',
            'CHECKED_OUT': 'COMPLETED',
            'CANCELLED': 'CANCELLED',
        };
        return statusMap[status] ?? 'CONFIRMED';
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    private groupByRoomId<T extends { roomId: string }>(
        items: T[]
    ): Record<string, T[]> {
        return items.reduce((acc, item) => {
            if (!acc[item.roomId]) {
                acc[item.roomId] = [];
            }
            acc[item.roomId].push(item);
            return acc;
        }, {} as Record<string, T[]>);
    }
}
