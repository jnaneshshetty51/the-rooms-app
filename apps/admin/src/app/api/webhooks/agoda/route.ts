// apps/admin/src/app/api/webhooks/agoda/route.ts
// Agoda webhook handler

import { NextRequest } from 'next/server';
import { ok, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { AgodaAdapter } from '@the-rooms/channel-manager/channels/agoda';
import { logger } from '@the-rooms/channel-manager/utils/logger';

const agodaLogger = logger.child({ channel: 'AGODA', component: 'webhook' });

const adapter = new AgodaAdapter();

export async function POST(request: NextRequest) {
    try {
        const clientIp = getClientIp(request);
        const body = await request.text();
        const signature = request.headers.get('X-Agoda-Signature') || '';

        agodaLogger.info({ clientIp, bodyLength: body.length }, 'Agoda webhook received');

        if (!adapter.verifyWebhookSignature(body, signature)) {
            agodaLogger.warn({ clientIp }, 'Invalid Agoda webhook signature');
            return ok({ received: true, verified: false });
        }

        const payload = adapter.parseWebhookPayload(body);

        // Look up channel to get channelId
        const channel = await db.channel.findFirst({ where: { name: 'AGODA' } });

        if (channel) {
            await db.webhookLog.create({
                data: {
                    channelId: channel.id,
                    channelName: 'AGODA',
                    webhookType: payload.eventType,
                    eventId: payload.eventId,
                    rawPayload: payload.data as object,
                    status: 'RECEIVED',
                },
            });
        }

        switch (payload.eventType) {
            case 'BOOKING_CREATED':
            case 'BOOKING_UPDATED':
            case 'BOOKING_CANCELLED':
                await handleBookingEvent(payload, channel?.id);
                break;
            case 'INVENTORY_CHANGED':
                await handleInventoryChangeEvent(payload);
                break;
            default:
                agodaLogger.info({ eventType: payload.eventType }, 'Unhandled Agoda event type');
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
            metadata: { channel: 'AGODA', eventType: payload.eventType },
            ipAddress: clientIp,
        });

        return ok({ received: true, verified: true, processed: true });
    } catch (error) {
        agodaLogger.error({ error }, 'Error processing Agoda webhook');

        await createAuditLog({
            action: 'WEBHOOK_ERROR',
            entity: 'webhook',
            metadata: { channel: 'AGODA', error: error instanceof Error ? error.message : 'Unknown error' },
            ipAddress: getClientIp(request),
        });

        return serverError('Webhook processing failed');
    }
}

async function handleBookingEvent(
    payload: { eventType: string; eventId: string; data: Record<string, unknown> },
    channelId?: string
) {
    const { data } = payload;
    const bookingId = data.booking_id as string;
    const confirmationNumber = data.confirmation_number as string;
    const bookingStatus = data.booking_status as string;

    agodaLogger.info({ bookingId, confirmationNumber, bookingStatus, eventType: payload.eventType }, 'Processing Agoda booking event');

    const existingMapping = channelId
        ? await db.otaBookingMapping.findFirst({
            where: { channelBookingId: bookingId, channelId },
        })
        : null;

    if (payload.eventType === 'BOOKING_CANCELLED') {
        if (existingMapping) {
            await db.booking.update({
                where: { id: existingMapping.bookingId },
                data: { status: 'CANCELLED' },
            });
        }
    } else {
        const guest = data.guest as Record<string, string>;
        const guestName = `${guest.first_name} ${guest.last_name}`;
        const checkIn = new Date(data.checkin_date as string);
        const checkOut = new Date(data.checkout_date as string);

        if (existingMapping) {
            await db.booking.update({
                where: { id: existingMapping.bookingId },
                data: { checkIn, checkOut, status: 'CONFIRMED' },
            });
        } else {
            agodaLogger.info({ bookingId, confirmationNumber, guestName }, 'New Agoda booking - requires property context for creation');
        }

        if (channelId) {
            if (existingMapping) {
                await db.otaBookingMapping.update({
                    where: { id: existingMapping.id },
                    data: {
                        channelBookingRef: confirmationNumber,
                        syncStatus: 'SYNCED',
                        lastSyncAt: new Date(),
                    },
                });
            } else {
                await db.otaBookingMapping.create({
                    data: {
                        channelBookingId: bookingId,
                        channelId,
                        channelBookingRef: confirmationNumber,
                        bookingId: `OTA-${bookingId}`,
                        bookingNumber: `OTA-${bookingId}`,
                        syncStatus: 'PENDING_UPDATE',
                        lastSyncAt: new Date(),
                    },
                });
            }
        }
    }
}

async function handleInventoryChangeEvent(payload: {
    eventType: string;
    eventId: string;
    data: Record<string, unknown>;
}) {
    const { data } = payload;
    const roomTypeId = data.room_type_id as string;
    agodaLogger.info({ roomTypeId, eventType: payload.eventType }, 'Processing Agoda inventory change - may need sync');
}
