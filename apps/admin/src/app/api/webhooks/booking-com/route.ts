// apps/admin/src/app/api/webhooks/booking-com/route.ts
// Booking.com webhook handler - Creates actual bookings from OTA data

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@the-rooms/db';
import { badRequest } from '@the-rooms/api';
import { BookingComAdapter } from '@the-rooms/channel-manager';
import { channelRegistry } from '@the-rooms/channel-manager';
import { ChannelName } from '@the-rooms/channel-manager';
import { verifyHmacSignature } from '@the-rooms/channel-manager';
import { generateBookingNumber } from '@the-rooms/db';
import { Prisma } from '@the-rooms/db';

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
        const event: BookingComWebhookEvent = JSON.parse(rawBody);
        console.log(`[BOOKING_COM_WEBHOOK] Received event: ${event.event}`);

        // Update webhook log with event type
        await db.webhookLog.update({
            where: { id: webhookLogId },
            data: { webhookType: event.event },
        });

        // Route to appropriate handler
        switch (event.event) {
            case 'booking.created':
            case 'booking.modified':
                await handleBookingCreatedOrModified(channel.id, event, webhookLogId);
                break;
            case 'booking.cancelled':
                await handleBookingCancelled(channel.id, event, webhookLogId);
                break;
            default:
                console.log(`[BOOKING_COM_WEBHOOK] Unhandled event type: ${event.event}`);
        }

        // Update webhook log as successful
        await db.webhookLog.update({
            where: { id: webhookLogId },
            data: {
                status: 'PROCESSED',
                processedAt: new Date(),
                processingTimeMs: Date.now() - startTime,
            },
        });

        return NextResponse.json({ success: true, event: event.event });
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

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ─── Event Handlers ────────────────────────────────────────────────────────────

async function handleBookingCreatedOrModified(
    channelId: string,
    event: BookingComWebhookEvent,
    webhookLogId: string
) {
    const { reservation_id, booking_id, status, checkin, checkout, guest_name, guest_email, total_amount } = event.payload;

    if (!reservation_id) {
        console.warn('[BOOKING_COM_WEBHOOK] Missing reservation_id');
        return;
    }

    // Check if booking mapping already exists
    let mapping = await db.otaBookingMapping.findFirst({
        where: { channelBookingId: reservation_id },
    });

    // ─── Find or Create Guest ──────────────────────────────────────────────
    let guest = guest_email
        ? await db.guest.findFirst({ where: { email: guest_email } })
        : null;

    if (!guest && guest_name) {
        // Extract phone if available, otherwise use placeholder
        guest = await db.guest.create({
            data: {
                name: guest_name,
                email: guest_email ?? null,
                phone: 'OTA-PENDING', // Placeholder until verified
            },
        });
    }

    if (!guest) {
        console.error('[BOOKING_COM_WEBHOOK] Could not find or create guest');
        await db.webhookLog.update({
            where: { id: webhookLogId },
            data: {
                status: 'FAILED',
                errorMessage: 'Guest not found and could not be created',
            },
        });
        return;
    }

    // ─── Find Available Room ──────────────────────────────────────────────
    const checkInDate = checkin ? new Date(checkin) : new Date();
    const checkOutDate = checkout ? new Date(checkout) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Find a vacant room that is available for these dates
    // This query finds rooms that are not OCCUPIED or BOOKED during the requested dates
    const availableRooms = await db.room.findMany({
        where: {
            status: { in: ['VACANT'] }, // Only vacant rooms
            propertyId: 'default',
            NOT: {
                // Exclude rooms with overlapping bookings
                bookings: {
                    some: {
                        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                        AND: [
                            { checkIn: { lt: checkOutDate } },
                            { checkOut: { gt: checkInDate } },
                        ],
                    },
                },
            },
        },
        take: 1,
    });

    let roomId: string;
    let roomAssignmentNote = '';
    let isOverbooking = false;

    if (availableRooms.length > 0) {
        roomId = availableRooms[0].id;
        roomAssignmentNote = `Auto-assigned Room ${availableRooms[0].roomNumber}`;
    } else {
        // No vacant room found - use first VACANT room as placeholder
        // This creates an overbooking situation that needs attention
        const fallbackRoom = await db.room.findFirst({
            where: { status: { in: ['VACANT'] }, propertyId: 'default' },
        });

        if (!fallbackRoom) {
            console.error('[BOOKING_COM_WEBHOOK] No rooms available at all - using placeholder');
            // Find ANY room to use as placeholder - this is an exception
            const anyRoom = await db.room.findFirst({
                where: { propertyId: 'default' },
            });
            roomId = anyRoom?.id ?? 'NO-ROOM';
            roomAssignmentNote = `CRITICAL: No rooms available! Manual intervention required.`;
            isOverbooking = true;
        } else {
            roomId = fallbackRoom.id;
            roomAssignmentNote = `WARNING: Room ${fallbackRoom.roomNumber} was auto-assigned but may conflict with existing bookings`;
            isOverbooking = true;
        }
    }

    // ─── Find or Create Booking ────────────────────────────────────────────
    if (!mapping) {
        // Create new booking
        const bookingNumber = await generateBookingNumber();
        const amount = total_amount ? parseFloat(total_amount) : 0;

        try {
            const booking = await db.booking.create({
                data: {
                    bookingNumber,
                    guestId: guest.id,
                    roomId: roomId,
                    propertyId: 'default',
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    guestsCount: 1,
                    bookingType: 'DAILY',
                    bookingSource: 'OTA',
                    status: 'CONFIRMED',
                    paymentStatus: 'PENDING', // OTA payments are usually handled by the OTA
                    baseAmount: new Prisma.Decimal(amount),
                    discountAmount: new Prisma.Decimal(0),
                    extrasAmount: new Prisma.Decimal(0),
                    totalAmount: new Prisma.Decimal(amount),
                    isOverbooking: isOverbooking,
                    specialRequests: `Booking.com reservation: ${reservation_id}. ${roomAssignmentNote}`,
                },
            });

            // Create OTA mapping linked to actual booking
            await db.otaBookingMapping.create({
                data: {
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    channelId: channelId,
                    channelBookingId: reservation_id,
                    channelBookingRef: booking_id ?? null,
                    lastSyncAt: new Date(),
                    syncStatus: 'SYNCED',
                },
            });

            // Create audit log
            await db.auditLog.create({
                data: {
                    action: 'OTA_BOOKING_CREATED',
                    entity: 'booking',
                    entityId: booking.id,
                    userId: 'SYSTEM',
                    metadata: {
                        channel: 'BOOKING_COM',
                        reservationId: reservation_id,
                        guestName: guest_name,
                        roomAssignment: roomAssignmentNote,
                    },
                },
            });

            console.log(`[BOOKING_COM_WEBHOOK] Created booking ${booking.bookingNumber} for OTA reservation ${reservation_id}`);
        } catch (err) {
            console.error('[BOOKING_COM_WEBHOOK] Error creating booking:', err);
            // Fall back to just creating mapping
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
        }
    } else {
        // Update existing mapping
        await db.otaBookingMapping.update({
            where: { id: mapping.id },
            data: {
                lastSyncAt: new Date(),
                syncStatus: 'SYNCED',
            },
        });

        // If mapping points to a real booking, update it
        if (mapping.bookingId && !mapping.bookingId.startsWith('OTA-')) {
            await db.booking.update({
                where: { id: mapping.bookingId },
                data: {
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    totalAmount: total_amount ? new Prisma.Decimal(parseFloat(total_amount)) : undefined,
                },
            });
        }

        console.log(`[BOOKING_COM_WEBHOOK] Updated existing booking for OTA reservation ${reservation_id}`);
    }
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

    // Find the OTA mapping
    const mapping = await db.otaBookingMapping.findFirst({
        where: { channelBookingId: reservation_id },
    });

    if (!mapping) {
        console.warn(`[BOOKING_COM_WEBHOOK] No mapping found for cancelled reservation ${reservation_id}`);
        return;
    }

    // Update mapping status
    await db.otaBookingMapping.update({
        where: { id: mapping.id },
        data: {
            lastSyncAt: new Date(),
            syncStatus: 'PENDING_CANCEL',
        },
    });

    // If mapping points to a real booking, cancel it
    if (mapping.bookingId && !mapping.bookingId.startsWith('OTA-')) {
        await db.booking.update({
            where: { id: mapping.bookingId },
            data: {
                status: 'CANCELLED',
            },
        });

        // Release the room
        await db.room.update({
            where: { id: mapping.bookingId },
            data: {
                status: 'VACANT',
            },
        });

        // Create audit log
        await db.auditLog.create({
            data: {
                action: 'OTA_BOOKING_CANCELLED',
                entity: 'booking',
                entityId: mapping.bookingId,
                userId: 'SYSTEM',
                metadata: {
                    channel: 'BOOKING_COM',
                    reservationId: reservation_id,
                },
            },
        });
    }

    console.log(`[BOOKING_COM_WEBHOOK] Processed cancellation for reservation ${reservation_id}`);
}
