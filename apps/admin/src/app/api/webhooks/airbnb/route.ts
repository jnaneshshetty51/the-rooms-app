// apps/admin/src/app/api/webhooks/airbnb/route.ts
// Airbnb webhook handler

import { NextRequest, NextResponse } from 'next/server';
import { ok, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { AirbnbAdapter } from '@the-rooms/channel-manager/channels/airbnb';
import { logger } from '@the-rooms/channel-manager/utils/logger';

const airbnbLogger = logger.child({ channel: 'AIRBNB', component: 'webhook' });

// Initialize adapter (will be configured per-request based on channel config)
const adapter = new AirbnbAdapter();

export async function POST(request: NextRequest) {
    try {
        const clientIp = getClientIp(request);
        const body = await request.text();
        const signature = request.headers.get('X-Airbnb-Signature') || '';

        // Log webhook receipt
        airbnbLogger.info({ clientIp, bodyLength: body.length }, 'Airbnb webhook received');

        // Verify signature
        if (!adapter.verifyWebhookSignature(body, signature)) {
            airbnbLogger.warn({ clientIp }, 'Invalid Airbnb webhook signature');
            return ok({ received: true, verified: false });
        }

        // Parse payload
        const payload = adapter.parseWebhookPayload(body);

        // Log webhook event
        await db.webhookLog.create({
            data: {
                channelName: 'AIRBNB',
                eventType: payload.eventType,
                eventId: payload.eventId,
                payload: payload.data as object,
                status: 'RECEIVED',
                receivedAt: payload.timestamp,
            },
        });

        // Handle different event types
        switch (payload.eventType) {
            case 'RESERVATION_CREATED':
            case 'RESERVATION_UPDATED':
            case 'RESERVATION_CANCELLED':
                await handleReservationEvent(payload);
                break;

            case 'LISTING_UPDATED':
                await handleListingUpdateEvent(payload);
                break;

            default:
                airbnbLogger.info({ eventType: payload.eventType }, 'Unhandled Airbnb event type');
        }

        // Update webhook log status
        await db.webhookLog.updateMany({
            where: { eventId: payload.eventId },
            data: { status: 'PROCESSED' },
        });

        await createAuditLog({
            action: 'WEBHOOK_PROCESSED',
            channel: 'AIRBNB',
            eventType: payload.eventType,
            eventId: payload.eventId,
            ip: clientIp,
        });

        return ok({ received: true, verified: true, processed: true });
    } catch (error) {
        airbnbLogger.error({ error }, 'Error processing Airbnb webhook');

        await createAuditLog({
            action: 'WEBHOOK_ERROR',
            channel: 'AIRBNB',
            error: error instanceof Error ? error.message : 'Unknown error',
            ip: getClientIp(request),
        });

        return serverError('Webhook processing failed');
    }
}

async function handleReservationEvent(payload: {
    eventType: string;
    eventId: string;
    data: Record<string, unknown>;
}) {
    const { data } = payload;
    const reservationId = data.id as string;
    const confirmationCode = data.confirmation_code as string;
    const status = data.status as string;

    airbnbLogger.info({
        reservationId,
        confirmationCode,
        status,
        eventType: payload.eventType,
    }, 'Processing reservation event');

    // Find or create OTA booking mapping
    const existingMapping = await db.otaBookingMapping.findFirst({
        where: {
            otaBookingId: reservationId,
            channelName: 'AIRBNB',
        },
    });

    if (payload.eventType === 'RESERVATION_CANCELLED') {
        // Handle cancellation
        if (existingMapping) {
            await db.booking.update({
                where: { id: existingMapping.pmsBookingId },
                data: { status: 'CANCELLED' },
            });
        }
    } else {
        // Handle new/updated booking
        // Map Airbnb reservation to PMS booking format
        const guestName = `${(data.guest as Record<string, string>).first_name} ${(data.guest as Record<string, string>).last_name}`;
        const guestEmail = (data.guest as Record<string, string>).email;
        const guestPhone = (data.guest as Record<string, string>).phone;
        const checkIn = new Date(data.start_date as string);
        const checkOut = new Date(data.end_date as string);
        const totalAmount = data.total_price as number;
        const currency = data.currency as string;
        const listingId = data.listing_id as string;

        if (existingMapping) {
            // Update existing booking
            await db.booking.update({
                where: { id: existingMapping.pmsBookingId },
                data: {
                    checkIn,
                    checkOut,
                    totalAmount,
                    status: 'CONFIRMED',
                },
            });
        } else {
            // Create new booking (would need propertyId lookup in real implementation)
            // For now, log the event - actual booking creation requires property context
            airbnbLogger.info({
                reservationId,
                confirmationCode,
                guestName,
            }, 'New Airbnb booking - requires property context for creation');
        }

        // Update or create mapping
        await db.otaBookingMapping.upsert({
            where: {
                otaBookingId_channelName: {
                    otaBookingId: reservationId,
                    channelName: 'AIRBNB',
                },
            },
            create: {
                otaBookingId: reservationId,
                channelName: 'AIRBNB',
                otaReference: confirmationCode,
                pmsBookingId: existingMapping?.pmsBookingId || '',
                syncStatus: 'SYNCED',
            },
            update: {
                otaReference: confirmationCode,
                syncStatus: 'SYNCED',
                lastSyncedAt: new Date(),
            },
        });
    }
}

async function handleListingUpdateEvent(payload: {
    eventType: string;
    eventId: string;
    data: Record<string, unknown>;
}) {
    const { data } = payload;
    const listingId = data.listing_id as string;

    airbnbLogger.info({
        listingId,
        eventType: payload.eventType,
    }, 'Processing listing update event - inventory sync may be needed');

    // Listing updates may affect availability - could trigger a full inventory sync
    // This would typically enqueue a sync job
}
