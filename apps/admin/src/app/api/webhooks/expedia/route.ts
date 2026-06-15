// apps/admin/src/app/api/webhooks/expedia/route.ts
// Expedia webhook handler

import { NextRequest } from 'next/server';
import { ok, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { ExpediaAdapter } from '@the-rooms/channel-manager/channels/expedia';
import { logger } from '@the-rooms/channel-manager/utils/logger';

const expediaLogger = logger.child({ channel: 'EXPEDIA', component: 'webhook' });

const adapter = new ExpediaAdapter();

export async function POST(request: NextRequest) {
    try {
        const clientIp = getClientIp(request);
        const body = await request.text();
        const signature = request.headers.get('X-Expedia-Signature') || '';

        expediaLogger.info({ clientIp, bodyLength: body.length }, 'Expedia webhook received');

        if (!adapter.verifyWebhookSignature(body, signature)) {
            expediaLogger.warn({ clientIp }, 'Invalid Expedia webhook signature');
            return ok({ received: true, verified: false });
        }

        const payload = adapter.parseWebhookPayload(body);

        const channel = await db.channel.findFirst({ where: { name: 'EXPEDIA' } });

        if (channel) {
            await db.webhookLog.create({
                data: {
                    channelId: channel.id,
                    channelName: 'EXPEDIA',
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
            case 'INVENTORY_UPDATED':
                await handleInventoryUpdateEvent(payload);
                break;
            default:
                expediaLogger.info({ eventType: payload.eventType }, 'Unhandled Expedia event type');
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
            metadata: { channel: 'EXPEDIA', eventType: payload.eventType },
            ipAddress: clientIp,
        });

        return ok({ received: true, verified: true, processed: true });
    } catch (error) {
        expediaLogger.error({ error }, 'Error processing Expedia webhook');

        await createAuditLog({
            action: 'WEBHOOK_ERROR',
            entity: 'webhook',
            metadata: { channel: 'EXPEDIA', error: error instanceof Error ? error.message : 'Unknown error' },
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
    const bookingId = data.bookingId as string;
    const confirmationNumber = data.confirmationNumber as string;

    expediaLogger.info({ bookingId, confirmationNumber, eventType: payload.eventType }, 'Processing Expedia reservation event');

    const existingMapping = channelId
        ? await db.otaBookingMapping.findFirst({
            where: { channelBookingId: bookingId, channelId },
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
        const guestNameData = data.guestName as Record<string, string>;
        const guestName = `${guestNameData.givenName} ${guestNameData.surname}`;
        const checkIn = new Date(data.checkIn as string);
        const checkOut = new Date(data.checkOut as string);

        if (existingMapping) {
            await db.booking.update({
                where: { id: existingMapping.bookingId },
                data: { checkIn, checkOut, status: 'CONFIRMED' },
            });
        } else {
            expediaLogger.info({ bookingId, confirmationNumber, guestName }, 'New Expedia booking - requires property context for creation');
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

async function handleInventoryUpdateEvent(payload: {
    eventType: string;
    eventId: string;
    data: Record<string, unknown>;
}) {
    const { data } = payload;
    const roomTypeId = data.roomTypeId as string;
    expediaLogger.info({ roomTypeId, eventType: payload.eventType }, 'Processing Expedia inventory update - may need rate sync');
}
