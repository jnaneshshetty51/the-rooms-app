// packages/channel-manager/src/channels/booking-com.ts
// Booking.com adapter implementation

import { BaseAdapter } from '../adapters/BaseAdapter';
import { ChannelName } from '../types/channel';
import type { ChannelConfig, ChannelCapabilities, SyncResult } from '../types';
import type { InventoryUpdate, RateUpdate } from '../types/inventory';
import type { OtaBooking, BookingUpdate } from '../types/booking';
import type { WebhookPayload } from '../types/webhook';
import { parseXml, buildXml, extractText, extractArray } from '../utils/xml-parser';
import { verifyHmacSignature } from '../utils/signature';
import { logger } from '../utils/logger';

interface BookingComHotelInfo {
    hotel_id: string;
    name: string;
    address: string;
    timezone: string;
    currency: string;
    room_count: string;
}

interface BookingComReservation {
    reservation_id: string;
    booking_id: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    checkin: string;
    checkout: string;
    room_id: string;
    room_name: string;
    total_amount: string;
    currency: string;
    status: string;
    special_requests: string;
    created: string;
    modified: string;
}

interface BookingComAvailability {
    room_id: string;
    date: string;
    available: string;
    total_rooms: string;
}

export class BookingComAdapter extends BaseAdapter {
    readonly channelName: ChannelName = ChannelName.BOOKING_COM;

    readonly capabilities: ChannelCapabilities = {
        supportsRealTimePush: true,
        supportsRealTimePull: true,
        supportsWebhook: true,
        supportsXML: true,
        supportsJSON: true,
        maxBatchSize: 1000,
        rateLimitPerHour: 5000,
    };

    private bookingComLogger = logger.child({ channel: 'BOOKING_COM' });

    async getHotelInfo(): Promise<{
        hotelId: string;
        name: string;
        address: string;
        timezone: string;
        currency: string;
        roomCount: number;
    }> {
        const response = await this.makeRequest<{ hotel: BookingComHotelInfo }>(
            'GET',
            '/xml/hotel_info'
        );

        return {
            hotelId: response.hotel.hotel_id,
            name: response.hotel.name,
            address: response.hotel.address,
            timezone: response.hotel.timezone,
            currency: response.hotel.currency,
            roomCount: parseInt(response.hotel.room_count, 10),
        };
    }

    async fetchInventory(startDate: Date, endDate: Date): Promise<InventoryUpdate[]> {
        const xml = this.buildAvailabilityRequest(startDate, endDate);

        const response = await this.makeRequest<string>('POST', '/xml/availability', {
            data: xml,
            headers: { 'Content-Type': 'application/xml' },
        });

        return this.parseAvailabilityResponse(response);
    }

    async pushInventory(inventory: InventoryUpdate[]): Promise<SyncResult> {
        const startTime = Date.now();
        const errors: { itemId: string; error: string }[] = [];
        let itemsSynced = 0;

        // Process in batches
        const batchSize = this.capabilities.maxBatchSize;
        for (let i = 0; i < inventory.length; i += batchSize) {
            const batch = inventory.slice(i, i + batchSize);

            try {
                const xml = this.buildAvailabilityPush(batch);
                await this.makeRequest<string>('POST', '/xml/availability', {
                    data: xml,
                    headers: { 'Content-Type': 'application/xml' },
                });
                itemsSynced += batch.length;
            } catch (error) {
                errors.push({
                    itemId: `batch-${i}`,
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
        const xml = this.buildRatesRequest(startDate, endDate);

        const response = await this.makeRequest<string>('POST', '/xml/rates', {
            data: xml,
            headers: { 'Content-Type': 'application/xml' },
        });

        return this.parseRatesResponse(response);
    }

    async pushRates(rates: RateUpdate[]): Promise<SyncResult> {
        const startTime = Date.now();
        const xml = this.buildRatesPush(rates);

        try {
            await this.makeRequest<string>('POST', '/xml/rates', {
                data: xml,
                headers: { 'Content-Type': 'application/xml' },
            });

            return {
                success: true,
                itemsSynced: rates.length,
                itemsFailed: 0,
                errors: [],
                durationMs: Date.now() - startTime,
                timestamp: new Date(),
            };
        } catch (error) {
            return {
                success: false,
                itemsSynced: 0,
                itemsFailed: rates.length,
                errors: [{
                    itemId: 'rates',
                    itemType: 'rate',
                    errorCode: 'RATE_SYNC_FAILED',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    retryable: true,
                }],
                durationMs: Date.now() - startTime,
                timestamp: new Date(),
            };
        }
    }

    async fetchBookings(since: Date): Promise<OtaBooking[]> {
        const response = await this.makeRequest<{ reservations: { reservation: BookingComReservation | BookingComReservation[] } }>(
            'GET',
            `/json/reservations?since=${since.toISOString()}`
        );

        const reservations = extractArray(response.reservations?.reservation) as BookingComReservation[];
        return reservations.map((r) => this.mapReservation(r));
    }

    async pushBookingUpdate(booking: BookingUpdate): Promise<SyncResult> {
        const startTime = Date.now();
        const xml = this.buildBookingUpdateXml(booking);

        try {
            await this.makeRequest<string>('POST', '/xml/reservations', {
                data: xml,
                headers: { 'Content-Type': 'application/xml' },
            });

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
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <reservation>
        <reservation_id>${bookingId}</reservation_id>
        <status>cancelled</status>
        <cancellation_reason>${reason}</cancellation_reason>
      </reservation>`;

        try {
            await this.makeRequest<string>('POST', '/xml/reservations', {
                data: xml,
                headers: { 'Content-Type': 'application/xml' },
            });

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
            this.bookingComLogger.warn('No webhook secret configured');
            return false;
        }
        return verifyHmacSignature(payload, signature, config.webhookSecret);
    }

    parseWebhookPayload(payload: string): WebhookPayload {
        const data = JSON.parse(payload);
        return {
            eventType: data.event,
            eventId: data.id,
            timestamp: new Date(data.created),
            data: data.payload,
        };
    }

    // XML builders
    private buildAvailabilityRequest(startDate: Date, endDate: Date): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
      <availability_request>
        <hotel_id>${this.getConfig().hotelId}</hotel_id>
        <start_date>${this.formatDate(startDate)}</start_date>
        <end_date>${this.formatDate(endDate)}</end_date>
      </availability_request>`;
    }

    private buildAvailabilityPush(inventory: InventoryUpdate[]): string {
        const rooms = inventory.map((inv) => `
      <room>
        <room_id>${inv.otaRoomTypeId}</room_id>
        <date>${this.formatDate(inv.date)}</date>
        <available>${inv.availableRooms}</available>
        <total_rooms>${inv.totalRooms}</total_rooms>
        <status>${inv.status}</status>
      </room>
    `).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
      <availability_update>
        <hotel_id>${this.getConfig().hotelId}</hotel_id>
        ${rooms}
      </availability_update>`;
    }

    private buildRatesRequest(startDate: Date, endDate: Date): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
      <rates_request>
        <hotel_id>${this.getConfig().hotelId}</hotel_id>
        <start_date>${this.formatDate(startDate)}</start_date>
        <end_date>${this.formatDate(endDate)}</end_date>
      </rates_request>`;
    }

    private buildRatesPush(rates: RateUpdate[]): string {
        const ratePlans = rates.map((rate) => `
      <rate>
        <room_id>${rate.otaRoomTypeId}</room_id>
        <rate_plan_id>${rate.otaRatePlanId}</rate_plan_id>
        <date>${this.formatDate(rate.date)}</date>
        <rate_single>${rate.rateSingle}</rate_single>
        <rate_double>${rate.rateDouble}</rate_double>
        <min_stay>${rate.minStay}</min_stay>
        <closed_to_arrival>${rate.closedToArrival}</closed_to_arrival>
        <closed_to_departure>${rate.closedToDeparture}</closed_to_departure>
      </rate>
    `).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
      <rates_update>
        <hotel_id>${this.getConfig().hotelId}</hotel_id>
        ${ratePlans}
      </rates_update>`;
    }

    private buildBookingUpdateXml(booking: BookingUpdate): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
      <reservation>
        <reservation_id>${booking.otaBookingId}</reservation_id>
        <status>${this.mapStatusToBookingCom(booking.status)}</status>
        ${booking.checkIn ? `<checkin>${this.formatDate(booking.checkIn)}</checkin>` : ''}
        ${booking.checkOut ? `<checkout>${this.formatDate(booking.checkOut)}</checkout>` : ''}
      </reservation>`;
    }

    // XML parsers
    private parseAvailabilityResponse(xml: string): InventoryUpdate[] {
        // Parse XML response and map to InventoryUpdate[]
        // This is a simplified implementation
        return [];
    }

    private parseRatesResponse(xml: string): RateUpdate[] {
        // Parse XML response and map to RateUpdate[]
        return [];
    }

    private mapReservation(r: BookingComReservation): OtaBooking {
        return {
            otaBookingId: r.reservation_id,
            otaReference: r.booking_id,
            guestName: r.guest_name,
            guestEmail: r.guest_email,
            guestPhone: r.guest_phone,
            checkIn: new Date(r.checkin),
            checkOut: new Date(r.checkout),
            roomTypeId: r.room_id,
            roomTypeName: r.room_name,
            totalAmount: parseFloat(r.total_amount),
            currency: r.currency,
            status: this.mapStatus(r.status),
            specialRequests: r.special_requests,
            createdAt: new Date(r.created),
            updatedAt: new Date(r.modified),
        };
    }

    private mapStatus(status: string): OtaBooking['status'] {
        const statusMap: Record<string, OtaBooking['status']> = {
            'booked': 'CONFIRMED',
            'cancelled': 'CANCELLED',
            'modified': 'MODIFIED',
        };
        return statusMap[status] ?? 'CONFIRMED';
    }

    private mapStatusToBookingCom(status: BookingUpdate['status']): string {
        const statusMap: Record<BookingUpdate['status'], string> = {
            'CONFIRMED': 'booked',
            'CHECKED_IN': 'checked_in',
            'CHECKED_OUT': 'checked_out',
            'CANCELLED': 'cancelled',
        };
        return statusMap[status] ?? 'booked';
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }
}
