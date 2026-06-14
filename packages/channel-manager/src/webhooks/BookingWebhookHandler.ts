// packages/channel-manager/src/webhooks/BookingWebhookHandler.ts
// Booking.com webhook handler

import { ChannelName } from '../types/channel';
import type { IWebhookHandler } from '../interfaces/IWebhookHandler';
import type { WebhookPayload } from '../types/webhook';
import { verifyHmacSignature } from '../utils/signature';
import { logger, ChildLogger } from '../utils/logger';
// @ts-ignore - workspace dependency
import { db } from '@the-rooms/db';

interface BookingComWebhookData {
    reservation_id: string;
    booking_id: string;
    guest_first_name: string;
    guest_last_name: string;
    guest_email: string;
    guest_phone: string;
    checkin: string;
    checkout: string;
    room_id: string;
    room_type: string;
    total_amount: string;
    currency: string;
    status: string;
    special_requests: string;
    created: string;
    modified: string;
}

export class BookingWebhookHandler implements IWebhookHandler {
    readonly channelName: ChannelName = ChannelName.BOOKING_COM;

    private supportedEvents = [
        'reservation.new',
        'reservation.modified',
        'reservation.cancelled',
        'availability.update',
        'rate.update',
    ];

    private handlerLogger: ChildLogger;

    constructor() {
        this.handlerLogger = logger.child({ channel: 'BOOKING_COM', component: 'WebhookHandler' });
    }

    verifySignature(payload: string, signature: string): boolean {
        // In production, fetch webhook secret from config
        const webhookSecret = process.env.BOOKING_COM_WEBHOOK_SECRET;
        if (!webhookSecret) {
            this.handlerLogger.warn('No webhook secret configured');
            return true; // Allow in development
        }
        return verifyHmacSignature(payload, signature, webhookSecret);
    }

    parsePayload(payload: string): WebhookPayload {
        const data = JSON.parse(payload);
        return {
            eventType: data.event,
            eventId: data.id,
            timestamp: new Date(data.created),
            data: data.payload,
        };
    }

    async process(payload: WebhookPayload): Promise<void> {
        this.handlerLogger.info('Processing webhook', { eventType: payload.eventType });

        switch (payload.eventType) {
            case 'reservation.new':
                await this.handleNewBooking(payload.data as unknown as BookingComWebhookData);
                break;
            case 'reservation.modified':
                await this.handleModifiedBooking(payload.data as unknown as BookingComWebhookData);
                break;
            case 'reservation.cancelled':
                await this.handleCancelledBooking(payload.data as unknown as BookingComWebhookData);
                break;
            case 'availability.update':
                await this.handleAvailabilityUpdate(payload.data);
                break;
            case 'rate.update':
                await this.handleRateUpdate(payload.data);
                break;
            default:
                this.handlerLogger.warn(`Unhandled event type: ${payload.eventType}`);
        }
    }

    getSupportedEventTypes(): string[] {
        return this.supportedEvents;
    }

    private async handleNewBooking(data: BookingComWebhookData): Promise<void> {
        const guestName = `${data.guest_first_name} ${data.guest_last_name}`.trim();

        // Find or create guest
        let guest = await db.guest.findFirst({
            where: { phone: data.guest_phone },
        });

        if (!guest) {
            guest = await db.guest.create({
                data: {
                    name: guestName,
                    phone: data.guest_phone,
                    email: data.guest_email,
                },
            });
        }

        // Find channel
        const channel = await db.channel.findUnique({
            where: { name: 'BOOKING_COM' },
        });

        if (!channel) {
            throw new Error('Booking.com channel not configured');
        }

        // Find available room
        const availableRoom = await db.room.findFirst({
            where: {
                status: 'VACANT',
                bookings: {
                    none: {
                        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                        checkIn: { lt: new Date(data.checkout) },
                        checkOut: { gt: new Date(data.checkin) },
                    },
                },
            },
        });

        if (!availableRoom) {
            this.handlerLogger.warn('No available room for booking', { reservationId: data.reservation_id });
            return;
        }

        // Create booking
        const booking = await db.booking.create({
            data: {
                bookingNumber: `BKN-${data.reservation_id}`,
                guestId: guest.id,
                roomId: availableRoom.id,
                checkIn: new Date(data.checkin),
                checkOut: new Date(data.checkout),
                bookingSource: 'OTA',
                bookingType: 'DAILY',
                status: 'CONFIRMED',
                paymentStatus: 'PENDING',
                baseAmount: new (db as any).Prisma.Decimal(data.total_amount),
                totalAmount: new (db as any).Prisma.Decimal(data.total_amount),
                specialRequests: data.special_requests,
            },
        });

        // Create OTA mapping
        await db.otaBookingMapping.create({
            data: {
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                channelId: channel.id,
                channelBookingId: data.reservation_id,
                channelBookingRef: data.booking_id,
                lastSyncAt: new Date(),
                syncStatus: 'SYNCED',
            },
        });

        this.handlerLogger.info('Booking imported from webhook', {
            bookingId: booking.id,
            otaBookingId: data.reservation_id,
        });
    }

    private async handleModifiedBooking(data: BookingComWebhookData): Promise<void> {
        // Find existing OTA mapping
        const mapping = await db.otaBookingMapping.findFirst({
            where: { channelBookingId: data.reservation_id },
        });

        if (!mapping) {
            this.handlerLogger.warn('Booking mapping not found for modification', {
                otaBookingId: data.reservation_id,
            });
            return;
        }

        // Update booking
        await db.booking.update({
            where: { id: mapping.bookingId },
            data: {
                checkIn: new Date(data.checkin),
                checkOut: new Date(data.checkout),
                specialRequests: data.special_requests,
            },
        });

        // Update mapping
        await db.otaBookingMapping.update({
            where: { id: mapping.id },
            data: {
                lastSyncAt: new Date(),
                syncStatus: 'SYNCED',
            },
        });

        this.handlerLogger.info('Booking updated from webhook', {
            bookingId: mapping.bookingId,
            otaBookingId: data.reservation_id,
        });
    }

    private async handleCancelledBooking(data: BookingComWebhookData): Promise<void> {
        // Find existing OTA mapping
        const mapping = await db.otaBookingMapping.findFirst({
            where: { channelBookingId: data.reservation_id },
        });

        if (!mapping) {
            this.handlerLogger.warn('Booking mapping not found for cancellation', {
                otaBookingId: data.reservation_id,
            });
            return;
        }

        // Cancel booking
        await db.booking.update({
            where: { id: mapping.bookingId },
            data: { status: 'CANCELLED' },
        });

        // Release room
        const booking = await db.booking.findUnique({
            where: { id: mapping.bookingId },
            select: { roomId: true },
        });

        if (booking) {
            await db.room.update({
                where: { id: booking.roomId },
                data: { status: 'VACANT' },
            });
        }

        // Update mapping
        await db.otaBookingMapping.update({
            where: { id: mapping.id },
            data: {
                lastSyncAt: new Date(),
                syncStatus: 'SYNCED',
            },
        });

        this.handlerLogger.info('Booking cancelled from webhook', {
            bookingId: mapping.bookingId,
            otaBookingId: data.reservation_id,
        });
    }

    private async handleAvailabilityUpdate(data: Record<string, unknown>): Promise<void> {
        // Handle external availability updates from Booking.com
        this.handlerLogger.info('Availability update received', { data });
    }

    private async handleRateUpdate(data: Record<string, unknown>): Promise<void> {
        // Handle external rate updates from Booking.com
        this.handlerLogger.info('Rate update received', { data });
    }
}
