// apps/admin/src/app/api/webhooks/agoda/route.ts
// Agoda webhook handler

import { NextRequest, NextResponse } from 'next/server';
import { ok, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { AgodaAdapter } from '@the-rooms/channel-manager/channels/agoda';
import { logger } from '@the-rooms/channel-manager/utils/logger';

const agodaLogger = logger.child({ channel: 'AGODA', component: 'webhook' });

// Initialize adapter
const adapter = new AgodaAdapter();

export async function POST(request: NextRequest) {
    try {
        const clientIp = getClientIp(request);
        const body = await request.text();
        const signature = request.headers.get('X-Agoda-Signature') || '';

        agodaLogger.info({ clientIp, bodyLength: body.length }, 'Agoda webhook received');

        // Verify signature
        if (!adapter.verifyWebhookSignature(body, signature)) {
            agodaLogger.warn({ clientIp }, 'Invalid Agoda webhook signature');
            return ok({ received: true, verified: false });
        }

        // Parse payload
        const payload = adapter.parseWebhookPayload(body);

        // Log webhook event
        await db.webhookLog.create({
            data: {
                channelName: 'AGODA',
                eventType: payload.eventType,
                eventId: payload.eventId,
                payload: payload.data as object,
                status: 'RECEIVED',
                receivedAt: payload.timestamp,
            },
        });

        // Handle different event types
        switch (payload.eventType) {
            case 'BOOKING_CREATED':
            case 'BOOKING_UPDATED':
            case 'BOOKING_CANCELLED':
                await handleBookingEvent(payload);
                break;

            case 'INVENTORY_CHANGED':
                await handleInventoryChangeEvent(payload);
                break;

            default:
                agodaLogger.info({ eventType: payload.eventType }, 'Unhandled Agoda event type');
        }

        // Update webhook log status
        await db.webhookLog.updateMany({
            where: { eventId: payload.eventId },
            data: { status: 'PROCESSED' },
        });

        await createAuditLog({
            action: 'WEBHOOK_PROCESSED',
            channel: 'AGODA',
            eventType: payload.eventType,
            eventId: payload.eventId,
            ip: clientIp,
        });

        return ok({ received: true, verified: true, processed: true });
    } catch (error) {
        agodaLogger.error({ error }, 'Error processing Agoda webhook');

        await createAuditLog({
            action: 'WEBHOOK_ERROR',
            channel: 'AGODA',
            error: error instanceof Error ? error.message : 'Unknown error',
            ip: getClientIp(request),
        });

        return serverError('Webhook processing failed');
    }
}

async function handleBookingEvent(payload: {
    eventType: string;
    eventId: string;
    data: Record<string, unknown>;
}) {
    const { data } = payload;
    const bookingId = data.booking_id as string;
    const confirmationNumber = data.confirmation_number as string;
    const bookingStatus = data.booking_status as string;

    agodaLogger.info({
        bookingId,
        confirmationNumber,
        bookingStatus,
        eventType: payload.eventType,
    }, 'Processing Agoda booking event');

    // Find or create OTA booking mapping
    const existingMapping = await db.otaBookingMapping.findFirst({
        where: {
            otaBookingId: bookingId,
            channelName: 'AGODA',
        },
    });

    if (payload.eventType === 'BOOKING_CANCELLED') {
        // Handle cancellation
        if (existingMapping) {
            await db.booking.update({
                where: { id: existingMapping.pmsBookingId },
                data: { status: 'CANCELLED' },
            });
        }
    } else {
        // Handle new/updated booking
        const guest = data.guest as Record<string, string>;
        const guestName = `${guest.first_name} ${guest.last_name}`;
        const guestEmail = guest.email;
        const guestPhone = guest.phone;
        const checkIn = new Date(data.checkin_date as string);
        const checkOut = new Date(data.checkout_date as string);
        const totalPrice = data.total_price as Record<string, number>;
        const totalAmount = totalPrice.amount;
        const currency = totalPrice.currency_code;
        const roomTypeId = data.room_type_id as string;

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
            agodaLogger.info({
                bookingId,
                confirmationNumber,
                guestName,
            }, 'New Agoda booking - requires property context for creation');
        }

        // Update or create mapping
        await db.otaBookingMapping.upsert({
            where: {
                otaBookingId_channelName: {
                    otaBookingId: bookingId,
                    channelName: 'AGODA',
                },
            },
            create: {
                otaBookingId: bookingId,
                channelName: 'AGODA',
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

async function handleInventoryChangeEvent(payload: {
    eventType: string;
    eventId: string;
    data: Record<string, unknown>;
}) {
    const { data } = payload;
    const roomTypeId = data.room_type_id as string;

    agodaLogger.info({
        roomTypeId,
        eventType: payload.eventType,
    }, 'Processing Agoda inventory change - may need sync');

    // Could enqueue a sync job here
}
