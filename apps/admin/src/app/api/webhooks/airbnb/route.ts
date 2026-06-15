// apps/admin/src/app/api/webhooks/airbnb/route.ts
// Airbnb webhook handler

import { NextRequest } from 'next/server';
import { ok, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { AirbnbAdapter } from '@the-rooms/channel-manager/channels/airbnb';
import { logger } from '@the-rooms/channel-manager/utils/logger';

const airbnbLogger = logger.child({ channel: 'AIRBNB', component: 'webhook' });

const adapter = new AirbnbAdapter();

export async function POST(request: NextRequest) {
    try {
        const clientIp = getClientIp(request);
        const body = await request.text();
        const signature = request.headers.get('X-Airbnb-Signature') || '';

        airbnbLogger.info({ clientIp, bodyLength: body.length }, 'Airbnb webhook received');

        if (!adapter.verifyWebhookSignature(body, signature)) {
            airbnbLogger.warn({ clientIp }, 'Invalid Airbnb webhook signature');
            return ok({ received: true, verified: false });
        }

        const payload = adapter.parseWebhookPayload(body);

        const channel = await db.channel.findFirst({ where: { name: 'AIRBNB' } });

        if (channel) {
            await db.webhookLog.create({
                data: {
                    channelId: channel.id,
                    channelName: 'AIRBNB',
                    webhookType: payload.eventType,
                    eventId: payload.eventId,
                    rawPayload: payload.data as object,
                    status: 'RECEIVED',
                },
            });
        }

        switch (payload.eventType) {
            case 'RESERVATION_CREATED':
            case 'RESERVATION_UPDATED':
            case 'RESERVATION_CANCELLED':
                await handleReservationEvent(payload, channel?.id);
                break;
            case 'LISTING_UPDATED':
                await handleListingUpdateEvent(payload);
                break;
            default:
                airbnbLogger.info({ eventType: payload.eventType }, 'Unhandled Airbnb event type');
        }

        if (payload.eventId && channel) {
            await db.webhookLog.updateMany({
                where: { channelId: channel.id, eventId: payload.eventId },
                data: { status: 'PROCESSED' },
            });
        }

        await createAuditLog({
            action: 'WEBHOOK_PROCESSED',
            entity: 'webhook',
            entityId: payload.eventId,
            metadata: { channel: 'AIRBNB', eventType: payload.eventType },
            ipAddress: clientIp,
        });

        return ok({ received: true, verified: true, processed: true });
    } catch (error) {
        airbnbLogger.error({ error }, 'Error processing Airbnb webhook');

        await createAuditLog({
            action: 'WEBHOOK_ERROR',
            entity: 'webhook',
            metadata: { channel: 'AIRBNB', error: error instanceof Error ? error.message : 'Unknown error' },
            ipAddress: getClientIp(request),
        });

        return serverError('Webhook processing failed');
    }
}

async function handleReservationEvent(
    payload: { eventType: string; eventId: string; data: Record<string, unknown> },
    channelId?: string
) {
    const { data } = payload;
    const reservationId = data.id as string;
    const confirmationCode = data.confirmation_code as string;

    airbnbLogger.info({ reservationId, confirmationCode, eventType: payload.eventType }, 'Processing reservation event');

    const existingMapping = channelId
        ? await db.otaBookingMapping.findFirst({
            where: { channelBookingId: reservationId, channelId },
        })
        : null;

    if (payload.eventType === 'RESERVATION_CANCELLED') {
        if (existingMapping) {
            await db.booking.update({
                where: { id: existingMapping.bookingId },
                data: { status: 'CANCELLED' },
            });
        }
    } else {
        const guestData = data.guest as Record<string, string>;
        const guestName = `${guestData.first_name} ${guestData.last_name}`;
        const checkIn = new Date(data.start_date as string);
        const checkOut = new Date(data.end_date as string);

        if (existingMapping) {
            await db.booking.update({
                where: { id: existingMapping.bookingId },
                data: { checkIn, checkOut, status: 'CONFIRMED' },
            });
        } else {
            airbnbLogger.info({ reservationId, confirmationCode, guestName }, 'New Airbnb booking - requires property context for creation');
        }

        if (channelId) {
            if (existingMapping) {
                await db.otaBookingMapping.update({
                    where: { id: existingMapping.id },
                    data: {
                        channelBookingRef: confirmationCode,
                        syncStatus: 'SYNCED',
                        lastSyncAt: new Date(),
                    },
                });
            } else {
                await db.otaBookingMapping.create({
                    data: {
                        channelBookingId: reservationId,
                        channelId,
                        channelBookingRef: confirmationCode,
                        bookingId: `OTA-${reservationId}`,
                        bookingNumber: `OTA-${reservationId}`,
                        syncStatus: 'PENDING_UPDATE',
                        lastSyncAt: new Date(),
                    },
                });
            }
        }
    }
}

async function handleListingUpdateEvent(payload: {
    eventType: string;
    eventId: string;
    data: Record<string, unknown>;
}) {
    const { data } = payload;
    const listingId = data.listing_id as string;
    airbnbLogger.info({ listingId, eventType: payload.eventType }, 'Processing listing update event - inventory sync may be needed');
}
