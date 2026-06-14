// packages/channel-manager/src/channels/expedia.ts
// Expedia adapter implementation

import { BaseAdapter } from '../adapters/BaseAdapter';
import { ChannelName } from '../types/channel';
import type { ChannelConfig, ChannelCapabilities, SyncResult } from '../types';
import type { InventoryUpdate, RateUpdate } from '../types/inventory';
import type { OtaBooking, BookingUpdate } from '../types/booking';
import type { WebhookPayload } from '../types/webhook';
import { logger } from '../utils/logger';
import { verifyHmacSignature } from '../utils/signature';

interface ExpediaProperty {
    propertyId: string;
    name: string;
    address: {
        line1: string;
        line2?: string;
        city: string;
        stateProvince: string;
        country: string;
        postalCode: string;
    };
    timeZone: string;
    currency: string;
    starRating: number;
}

interface ExpediaReservation {
    bookingId: string;
    confirmationNumber: string;
    guestName: {
        givenName: string;
        surname: string;
    };
    guestEmail: string;
    guestPhone: string;
    roomTypeId: string;
    roomTypeName: string;
    checkIn: string;
    checkOut: string;
    totalRate: {
        amount: number;
        currency: string;
    };
    status: string;
    created: string;
    modified: string;
    specialRequests?: string;
}

interface ExpediaAvailability {
    roomTypeId: string;
    date: string;
    available: boolean;
    totalRoomsAvailable: number;
    totalRooms: number;
}

interface ExpediaRate {
    roomTypeId: string;
    ratePlanId: string;
    date: string;
    dailyRate: number;
    minStay: number;
    maxStay: number;
    closedToArrival: boolean;
    closedToDeparture: boolean;
}

export class ExpediaAdapter extends BaseAdapter {
    readonly channelName: ChannelName = ChannelName.EXPEDIA;

    readonly capabilities: ChannelCapabilities = {
        supportsRealTimePush: true,
        supportsRealTimePull: true,
        supportsWebhook: true,
        supportsXML: false,
        supportsJSON: true,
        maxBatchSize: 500,
        rateLimitPerHour: 3000,
    };

    private expediaLogger = logger.child({ channel: 'EXPEDIA' });

    async getHotelInfo(): Promise<{
        hotelId: string;
        name: string;
        address: string;
        timezone: string;
        currency: string;
        roomCount: number;
    }> {
        const response = await this.makeRequest<{ property: ExpediaProperty }>(
            'GET',
            '/properties/me'
        );

        const property = response.property;

        return {
            hotelId: property.propertyId,
            name: property.name,
            address: this.formatAddress(property.address),
            timezone: property.timeZone,
            currency: property.currency,
            roomCount: 0, // Expedia doesn't provide room count in property info
        };
    }

    async fetchInventory(startDate: Date, endDate: Date): Promise<InventoryUpdate[]> {
        const response = await this.makeRequest<{ availabilityList: ExpediaAvailability[] }>(
            'GET',
            `/properties/${this.getConfig().propertyId}/availability`,
            {
                params: {
                    startDate: this.formatDate(startDate),
                    endDate: this.formatDate(endDate),
                },
            }
        );

        return response.availabilityList.map((avail) => ({
            roomId: avail.roomTypeId,
            otaRoomTypeId: avail.roomTypeId,
            date: new Date(avail.date),
            availableRooms: avail.totalRoomsAvailable,
            totalRooms: avail.totalRooms,
            status: avail.available ? 'AVAILABLE' : 'SOLD_OUT',
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
                    totalRoomsAvailable: update.availableRooms,
                    totalRoomsAtProperty: update.totalRooms,
                }));

                await this.makeRequest<void>(
                    'PUT',
                    `/properties/${this.getConfig().propertyId}/room-types/${roomTypeId}/availability`,
                    {
                        data: JSON.stringify({ availabilityList: payload }),
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
        const response = await this.makeRequest<{ rateList: ExpediaRate[] }>(
            'GET',
            `/properties/${this.getConfig().propertyId}/rates`,
            {
                params: {
                    startDate: this.formatDate(startDate),
                    endDate: this.formatDate(endDate),
                },
            }
        );

        return response.rateList.map((rate) => ({
            roomId: rate.roomTypeId,
            otaRoomTypeId: rate.roomTypeId,
            otaRatePlanId: rate.ratePlanId,
            date: new Date(rate.date),
            rateSingle: rate.dailyRate,
            rateDouble: rate.dailyRate,
            currency: 'USD', // Expedia typically uses USD
            minStay: rate.minStay,
            maxStay: rate.maxStay,
            closedToArrival: rate.closedToArrival,
            closedToDeparture: rate.closedToDeparture,
        }));
    }

    async pushRates(rates: RateUpdate[]): Promise<SyncResult> {
        const startTime = Date.now();
        const errors: { itemId: string; error: string }[] = [];
        let itemsSynced = 0;

        // Group by room type and rate plan
        const byRoomType = this.groupByRoomId(rates);

        for (const [roomTypeId, updates] of Object.entries(byRoomType)) {
            try {
                const payload = updates.map((update) => ({
                    ratePlanId: update.otaRatePlanId,
                    date: this.formatDate(update.date),
                    dailyRate: update.rateSingle,
                    minStayRequirement: update.minStay,
                    closedToArrival: update.closedToArrival,
                    closedToDeparture: update.closedToDeparture,
                }));

                await this.makeRequest<void>(
                    'PUT',
                    `/properties/${this.getConfig().propertyId}/room-types/${roomTypeId}/rates`,
                    {
                        data: JSON.stringify({ rateList: payload }),
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
        const response = await this.makeRequest<{ reservationList: ExpediaReservation[] }>(
            'GET',
            `/properties/${this.getConfig().propertyId}/reservations`,
            {
                params: {
                    filter: 'active',
                    fromDate: this.formatDate(since),
                },
            }
        );

        return response.reservationList.map((r) => this.mapReservation(r));
    }

    async pushBookingUpdate(booking: BookingUpdate): Promise<SyncResult> {
        const startTime = Date.now();

        try {
            const status = this.mapStatusToExpedia(booking.status);

            await this.makeRequest<void>(
                'POST',
                `/properties/${this.getConfig().propertyId}/reservations/${booking.otaBookingId}`,
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
                `/properties/${this.getConfig().propertyId}/reservations/${bookingId}/cancel`,
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
            this.expediaLogger.warn('No webhook secret configured');
            return false;
        }

        // Expedia uses HMAC-SHA256 signatures
        return verifyHmacSignature(payload, signature, config.webhookSecret);
    }

    parseWebhookPayload(payload: string): WebhookPayload {
        const data = JSON.parse(payload);

        return {
            eventType: data.eventType,
            eventId: data.reservationId || data.bookingId,
            timestamp: new Date(data.timestamp || data.created),
            data: data,
        };
    }

    // Helper methods
    private formatAddress(address: ExpediaProperty['address']): string {
        const parts = [
            address.line1,
            address.line2,
            address.city,
            address.stateProvince,
            address.country,
        ].filter(Boolean);
        return parts.join(', ');
    }

    private mapReservation(r: ExpediaReservation): OtaBooking {
        return {
            otaBookingId: r.bookingId,
            otaReference: r.confirmationNumber,
            guestName: `${r.guestName.givenName} ${r.guestName.surname}`,
            guestEmail: r.guestEmail,
            guestPhone: r.guestPhone,
            checkIn: new Date(r.checkIn),
            checkOut: new Date(r.checkOut),
            roomTypeId: r.roomTypeId,
            roomTypeName: r.roomTypeName,
            totalAmount: r.totalRate.amount,
            currency: r.totalRate.currency,
            status: this.mapStatus(r.status),
            specialRequests: r.specialRequests,
            createdAt: new Date(r.created),
            updatedAt: new Date(r.modified),
        };
    }

    private mapStatus(status: string): OtaBooking['status'] {
        const statusMap: Record<string, OtaBooking['status']> = {
            'RESERVED': 'CONFIRMED',
            'BOOKED': 'CONFIRMED',
            'CHECKED_IN': 'CONFIRMED',
            'CHECKED_OUT': 'MODIFIED',
            'CANCELLED': 'CANCELLED',
            'NO_SHOW': 'CANCELLED',
        };
        return statusMap[status] ?? 'CONFIRMED';
    }

    private mapStatusToExpedia(status: BookingUpdate['status']): string {
        const statusMap: Record<BookingUpdate['status'], string> = {
            'CONFIRMED': 'RESERVED',
            'CHECKED_IN': 'CHECKED_IN',
            'CHECKED_OUT': 'CHECKED_OUT',
            'CANCELLED': 'CANCELLED',
        };
        return statusMap[status] ?? 'RESERVED';
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
