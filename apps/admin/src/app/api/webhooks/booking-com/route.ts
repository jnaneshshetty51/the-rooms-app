// apps/admin/src/app/api/webhooks/booking-com/route.ts
// Booking.com webhook handler

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { BookingComAdapter } from '@the-rooms/channel-manager';
import { channelRegistry } from '@the-rooms/channel-manager';
import { ChannelName } from '@the-rooms/channel-manager';
import { verifyHmacSignature } from '@the-rooms/channel-manager';

// ─── Booking.com Webhook Events ────────────────────────────────────────────────

interface BookingComWebhookEvent {
    event: string;
    id: string;
    created: string;
    payload: {
        reservation_id?: string;
        booking_id?: string;
        status?: string;
        checkin?: string;
        checkout?: string;
        guest_name?: string;
        guest_email?: string;
        total_amount?: string;
        currency?: string;
    };
}

// ─── POST /api/webhooks/booking-com ──────────────────────────────────────────

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let webhookLogId: string | null = null;

    try {
        // Get raw body for signature verification
        const rawBody = await request.text();
        const signature = request.headers.get('x-booking-signature') ??
            request.headers.get('x-webhook-signature') ?? '';

        // Find Booking.com channel
        const channel = await db.channel.findFirst({
            where: { name: ChannelName.BOOKING_COM },
        });

        if (!channel) {
            console.error('[BOOKING_COM_WEBHOOK] Channel not found');
            return badRequest('Channel not configured', 'CHANNEL_NOT_FOUND');
        }

        // Create webhook log entry
        const webhookLog = await db.webhookLog.create({
            data: {
                channelId: channel.id,
                channelName: 'BOOKING_COM',
                webhookType: 'unknown',
                eventId: null,
                rawPayload: JSON.parse(rawBody) as object,
                status: 'RECEIVED',
            },
        });
        webhookLogId = webhookLog.id;

        // Verify channel has webhook secret configured
        const config = (channel.config as Record<string, string>) ?? {};
        const webhookSecret = config.webhookSecret;

        if (!webhookSecret) {
            console.error('[BOOKING_COM_WEBHOOK] No webhook secret configured');
            await db.webhookLog.update({
                where: { id: webhookLogId },
                data: {
                    status: 'FAILED',
                    errorMessage: 'No webhook secret configured',
                    processedAt: new Date(),
                    processingTimeMs: Date.now() - startTime,
                },
            });
            return badRequest('Webhook not configured', 'WEBHOOK_NOT_CONFIGURED');
        }

        // Verify signature
        const isValid = verifyHmacSignature(rawBody, signature, webhookSecret);
        if (!isValid) {
            console.warn('[BOOKING_COM_WEBHOOK] Invalid signature');
            await db.webhookLog.update({
                where: { id: webhookLogId },
                data: {
                    status: 'FAILED',
                    errorMessage: 'Invalid signature',
                    processedAt: new Date(),
                    processingTimeMs: Date.now() - startTime,
                },
            });
            return badRequest('Invalid signature', 'INVALID_SIGNATURE');
        }

        // Parse payload
        let event: BookingComWebhookEvent;
        try {
            event = JSON.parse(rawBody);
        } catch {
            console.error('[BOOKING_COM_WEBHOOK] Failed to parse payload');
            await db.webhookLog.update({
                where: { id: webhookLogId },
                data: {
                    status: 'FAILED',
                    errorMessage: 'Failed to parse JSON payload',
                    processedAt: new Date(),
                    processingTimeMs: Date.now() - startTime,
                },
            });
            return badRequest('Invalid JSON payload', 'INVALID_PAYLOAD');
        }

        // Update webhook log with event details
        await db.webhookLog.update({
            where: { id: webhookLogId },
            data: {
                webhookType: event.event,
                eventId: event.id,
                status: 'VALIDATED',
                parsedPayload: event as object,
            },
        });

        // Process the webhook event
        await db.webhookLog.update({
            where: { id: webhookLogId },
            data: { status: 'PROCESSING' },
        });

        // Handle different event types
        switch (event.event) {
            case 'reservation.created':
            case 'reservation.modified':
                await handleBookingCreatedOrModified(channel.id, event, webhookLogId);
                break;
            case 'reservation.cancelled':
                await handleBookingCancelled(channel.id, event, webhookLogId);
                break;
            case 'inventory.update':
                await handleInventoryUpdate(channel.id, event, webhookLogId);
                break;
            default:
                console.log(`[BOOKING_COM_WEBHOOK] Unhandled event type: ${event.event}`);
        }

        // Mark as processed
        await db.webhookLog.update({
            where: { id: webhookLogId },
            data: {
                status: 'PROCESSED',
                processedAt: new Date(),
                processingTimeMs: Date.now() - startTime,
                responseStatus: 200,
                responseBody: 'OK',
            },
        });

        return ok({ received: true, webhookId: webhookLogId });
    } catch (error) {
        console.error('[BOOKING_COM_WEBHOOK] Error processing webhook:', error);

        if (webhookLogId) {
            await db.webhookLog.update({
                where: { id: webhookLogId },
                data: {
                    status: 'FAILED',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    processedAt: new Date(),
                    processingTimeMs: Date.now() - startTime,
                },
            });
        }

        return serverError('Failed to process webhook', 'WEBHOOK_ERROR');
    }
}

// ─── Event Handlers ────────────────────────────────────────────────────────────

async function handleBookingCreatedOrModified(
    channelId: string,
    event: BookingComWebhookEvent,
    webhookLogId: string
) {
    const { reservation_id, booking_id, status, checkin, checkout, guest_name, guest_email, total_amount, currency } = event.payload;

    if (!reservation_id) {
        console.warn('[BOOKING_COM_WEBHOOK] Missing reservation_id');
        return;
    }

    // Check if booking mapping exists
    let mapping = await db.otaBookingMapping.findFirst({
        where: { channelBookingId: reservation_id },
    });

    if (!mapping) {
        // Create new booking mapping
        // Note: In production, you would create the actual booking in the system
        // For now, we just create the mapping
        console.log(`[BOOKING_COM_WEBHOOK] New booking from OTA: ${reservation_id}`);

        // Find or create guest
        let guest = guest_email
            ? await db.guest.findFirst({ where: { email: guest_email } })
            : null;

        if (!guest && guest_name) {
            guest = await db.guest.create({
                data: {
                    name: guest_name,
                    email: guest_email ?? null,
                    phone: '0000000000', // Placeholder
                },
            });
        }

        // Create a placeholder mapping - actual booking creation would happen
        // when front-office staff confirms the OTA booking
        await db.otaBookingMapping.create({
            data: {
                bookingId: `OTA-${reservation_id}`,
                bookingNumber: `OTA-${reservation_id}`,
                channelId: channelId,
                channelBookingId: reservation_id,
                channelBookingRef: booking_id ?? null,
                lastSyncAt: new Date(),
                syncStatus: 'PENDING_UPDATE',
            },
        });
    } else {
        // Update existing mapping
        await db.otaBookingMapping.update({
            where: { id: mapping.id },
            data: {
                lastSyncAt: new Date(),
                syncStatus: 'SYNCED',
            },
        });
    }

    console.log(`[BOOKING_COM_WEBHOOK] Processed booking event: ${event.event} for ${reservation_id}`);
}

async function handleBookingCancelled(
    channelId: string,
    event: BookingComWebhookEvent,
    webhookLogId: string
) {
    const { reservation_id } = event.payload;

    if (!reservation_id) {
        console.warn('[BOOKING_COM_WEBHOOK] Missing reservation_id for cancellation');
        return;
    }

    // Find the booking mapping
    const mapping = await db.otaBookingMapping.findFirst({
        where: { channelBookingId: reservation_id },
    });

    if (mapping) {
        // Update sync status to pending cancel
        await db.otaBookingMapping.update({
            where: { id: mapping.id },
            data: {
                lastSyncAt: new Date(),
                syncStatus: 'PENDING_CANCEL',
            },
        });

        console.log(`[BOOKING_COM_WEBHOOK] Booking cancelled: ${reservation_id}`);
    } else {
        console.warn(`[BOOKING_COM_WEBHOOK] Cancellation for unknown booking: ${reservation_id}`);
    }
}

async function handleInventoryUpdate(
    channelId: string,
    event: BookingComWebhookEvent,
    webhookLogId: string
) {
    // Inventory updates from Booking.com would trigger a re-sync
    // This is a simplified implementation
    console.log(`[BOOKING_COM_WEBHOOK] Inventory update event received`);

    // In production, you might want to:
    // 1. Parse the inventory changes from the payload
    // 2. Update local inventory snapshots
    // 3. Trigger a conflict check
}

// ─── GET /api/webhooks/booking-com ─────────────────────────────────────────────
// Health check endpoint for webhook verification

export async function GET(request: NextRequest) {
    const challenge = request.nextUrl.searchParams.get('challenge');

    if (challenge) {
        // Booking.com sends a challenge to verify the endpoint
        return new NextResponse(challenge, { status: 200 });
    }

    return ok({ status: 'ok', message: 'Booking.com webhook endpoint' });
}
