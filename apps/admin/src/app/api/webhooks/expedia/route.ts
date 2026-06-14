// apps/admin/src/app/api/webhooks/expedia/route.ts
// Expedia webhook handler

import { NextRequest, NextResponse } from 'next/server';
import { ok, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { ExpediaAdapter } from '@the-rooms/channel-manager/channels/expedia';
import { logger } from '@the-rooms/channel-manager/utils/logger';

const expediaLogger = logger.child({ channel: 'EXPEDIA', component: 'webhook' });

// Initialize adapter
const adapter = new ExpediaAdapter();

export async function POST(request: NextRequest) {
    try {
        const clientIp = getClientIp(request);
        const body = await request.text();
        const signature = request.headers.get('X-Expedia-Signature') || '';

        expediaLogger.info({ clientIp, bodyLength: body.length }, 'Expedia webhook received');

        // Verify signature
        if (!adapter.verifyWebhookSignature(body, signature)) {
            expediaLogger.warn({ clientIp }, 'Invalid Expedia webhook signature');
            return ok({ received: true, verified: false });
        }

        // Parse payload
        const payload = adapter.parseWebhookPayload(body);

        // Log webhook event
        await db.webhookLog.create({
            data: {
                channelName: 'EXPEDIA',
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

            case 'INVENTORY_UPDATED':
                await handleInventoryUpdateEvent(payload);
                break;

            default:
                expediaLogger.info({ eventType: payload.eventType }, 'Unhandled Expedia event type');
        }

        // Update webhook log status
        await db.webhookLog.updateMany({
            where: { eventId: payload.eventId },
            data: { status: 'PROCESSED' },
        });

        await createAuditLog({
            action: 'WEBHOOK_PROCESSED',
            channel: 'EXPEDIA',
            eventType: payload.eventType,
            eventId: payload.eventId,
            ip: clientIp,
        });

        return ok({ received: true, verified: true, processed: true });
    } catch (error) {
        expediaLogger.error({ error }, 'Error processing Expedia webhook');

        await createAuditLog({
            action: 'WEBHOOK_ERROR',
            channel: 'EXPEDIA',
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
    const bookingId = data.bookingId as string;
    const confirmationNumber = data.confirmationNumber as string;
    const status = data.status as string;

    expediaLogger.info({
        bookingId,
        confirmationNumber,
        status,
        eventType: payload.eventType,
    }, 'Processing Expedia reservation event');

    // Find or create OTA booking mapping
    const existingMapping = await db.otaBookingMapping.findFirst({
        where: {
            otaBookingId: bookingId,
            channelName: 'EXPEDIA',
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
        const guestName = `${(data.guestName as Record<string, string>).givenName} ${(data.guestName as Record<string, string>).surname}`;
        const guestEmail = data.guestEmail as string;
        const guestPhone = data.guestPhone as string;
        const checkIn = new Date(data.checkIn as string);
        const checkOut = new Date(data.checkOut as string);
        const totalAmount = (data.totalRate as Record<string, number>).amount;
        const currency = (data.totalRate as Record<string, string>).currency;
        const roomTypeId = data.roomTypeId as string;

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
            // Log for new booking - actual creation requires property context
            expediaLogger.info({
                bookingId,
                confirmationNumber,
                guestName,
            }, 'New Expedia booking - requires property context for creation');
        }

        // Update or create mapping
        await db.otaBookingMapping.upsert({
            where: {
                otaBookingId_channelName: {
                    otaBookingId: bookingId,
                    channelName: 'EXPEDIA',
                },
            },
            create: {
                otaBookingId: bookingId,
                channelName: 'EXPEDIA',
                otaReference: confirmationNumber,
                pmsBookingId: existingMapping?.pmsBookingId || '',
                syncStatus: 'SYNCED',
            },
            update: {
                otaReference: confirmationNumber,
                syncStatus: 'SYNCED',
                lastSyncedAt: new Date(),
            },
        });
    }
}

async function handleInventoryUpdateEvent(payload: {
    eventType: string;
    eventId: string;
    data: Record<string, unknown>;
}) {
    const { data } = payload;
    const roomTypeId = data.roomTypeId as string;

    expediaLogger.info({
        roomTypeId,
        eventType: payload.eventType,
    }, 'Processing Expedia inventory update - may need rate sync');

    // Could enqueue a sync job here
}
