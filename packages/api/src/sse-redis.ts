// packages/api/src/sse-redis.ts
// Redis-backed SSE for multi-server support

import { EventEmitter } from 'events';
import { getRedisClient } from '@the-rooms/db/lib/redis';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SSERoomMessage {
    type: string;
    propertyId?: string;
    data: unknown;
    timestamp: number;
}

interface SSEClient {
    id: string;
    controller: ReadableStreamDefaultController<Uint8Array>;
    propertyId?: string;
    userId?: string;
    userRole?: string;
}

// ─── Redis Channels ───────────────────────────────────────────────────────────

export const SSE_CHANNELS = {
    BOOKING: 'sse:booking',
    ROOM: 'sse:room',
    PAYMENT: 'sse:payment',
    HOUSEKEEPING: 'sse:housekeeping',
    SYSTEM: 'sse:system',
} as const;

// ─── Local SSE Emitter (for same-server connections) ─────────────────────────

class LocalSSEEmitter extends EventEmitter {
    private static instance: LocalSSEEmitter;

    static getInstance(): LocalSSEEmitter {
        if (!LocalSSEEmitter.instance) {
            LocalSSEEmitter.instance = new LocalSSEEmitter();
        }
        return LocalSSEEmitter.instance;
    }
}

export const sseEmitter = LocalSSEEmitter.getInstance();

// ─── Redis Subscriber (per connection) ──────────────────────────────────────

class SSERedisSubscriber {
    private subscriber: ReturnType<NonNullable<ReturnType<typeof getRedisClient>>['duplicate']> | null = null;
    private channel: string;
    private messageHandler: ((channel: string, message: string) => void) | null = null;

    constructor(channel: string) {
        this.channel = channel;
    }

    async subscribe(onMessage: (message: SSERoomMessage) => void): Promise<void> {
        const redis = getRedisClient();
        if (!redis) {
            console.warn('[SSE-Redis] Redis not available, falling back to local-only');
            return;
        }

        // Create duplicate connection for subscribing
        // Note: ioredis.duplicate() returns a new Redis instance
        this.subscriber = redis.duplicate();

        await this.subscriber.subscribe(this.channel);

        this.messageHandler = (_ch: string, msg: string) => {
            try {
                const parsed = JSON.parse(msg) as SSERoomMessage;
                onMessage(parsed);
            } catch {
                // Ignore parse errors
            }
        };

        this.subscriber.on('message', this.messageHandler);
    }

    async unsubscribe(): Promise<void> {
        if (this.subscriber) {
            if (this.messageHandler) {
                this.subscriber.off('message', this.messageHandler);
            }
            await this.subscriber.unsubscribe(this.channel);
            this.subscriber.disconnect();
            this.subscriber = null;
        }
    }
}

// ─── Client Management (Local) ───────────────────────────────────────────────

const clients = new Map<string, SSEClient>();

export function addClient(client: SSEClient): void {
    clients.set(client.id, client);
    console.log(`[SSE-Redis] Client connected: ${client.id} (property: ${client.propertyId || 'all'}, role: ${client.userRole || 'unknown'})`);
}

export function removeClient(id: string): void {
    const client = clients.get(id);
    if (client) {
        clients.delete(id);
        console.log(`[SSE-Redis] Client disconnected: ${id}`);
    }
}

export function getClientCount(): number {
    return clients.size;
}

// ─── Broadcasting ────────────────────────────────────────────────────────────

/**
 * Broadcast to local clients only (same server)
 */
function broadcastToLocalClients(propertyId: string | null, event: string, data: unknown): void {
    const encoder = new TextEncoder();
    const message = formatSSEMessage(event, data);

    clients.forEach((client) => {
        // Skip if client has a specific property filter and it doesn't match
        if (client.propertyId && propertyId && client.propertyId !== propertyId) {
            return;
        }

        try {
            client.controller.enqueue(encoder.encode(message));
        } catch (error) {
            console.error(`[SSE-Redis] Failed to send to client ${client.id}:`, error);
            removeClient(client.id);
        }
    });
}

/**
 * Broadcast to property via Redis (cross-server) and local EventEmitter
 */
export async function broadcastToProperty(
    propertyId: string,
    event: string,
    data: unknown
): Promise<void> {
    const message: SSERoomMessage = {
        type: event,
        propertyId,
        data,
        timestamp: Date.now(),
    };

    // Publish to Redis for cross-server broadcast
    const channel = `${SSE_CHANNELS.SYSTEM}:${propertyId}`;
    const redis = getRedisClient();

    if (redis) {
        try {
            await redis.publish(channel, JSON.stringify(message));
        } catch (error) {
            console.warn('[SSE-Redis] Failed to publish to Redis:', error);
        }
    }

    // Also emit locally for same-server connections
    sseEmitter.emit('message', message);

    // And broadcast directly to local clients
    broadcastToLocalClients(propertyId, event, data);
}

/**
 * Broadcast to all connected clients (global events)
 */
export async function broadcastToAll(
    event: string,
    data: unknown
): Promise<void> {
    const encoder = new TextEncoder();
    const message = formatSSEMessage(event, data);

    // Broadcast to all local clients
    clients.forEach((client) => {
        try {
            client.controller.enqueue(encoder.encode(message));
        } catch (error) {
            console.error(`[SSE-Redis] Failed to send to client ${client.id}:`, error);
            removeClient(client.id);
        }
    });

    // Also emit via local emitter
    sseEmitter.emit('message', {
        type: event,
        data,
        timestamp: Date.now(),
    });
}

/**
 * Broadcast to admins and super_admins across all properties
 */
export async function broadcastToAdmins(event: string, data: unknown): Promise<void> {
    const encoder = new TextEncoder();
    const message = formatSSEMessage(event, data);

    clients.forEach((client) => {
        if (client.userRole === 'ADMIN' || client.userRole === 'SUPER_ADMIN') {
            try {
                client.controller.enqueue(encoder.encode(message));
            } catch (error) {
                console.error(`[SSE-Redis] Failed to send to admin client ${client.id}:`, error);
                removeClient(client.id);
            }
        }
    });
}

// ─── Message Formatting ───────────────────────────────────────────────────────

export function formatSSEMessage(event: string, data: unknown, id?: string): string {
    let message = '';

    if (id) {
        message += `id: ${id}\n`;
    }

    message += `event: ${event}\n`;

    if (typeof data === 'string') {
        message += `data: ${data}\n`;
    } else {
        message += `data: ${JSON.stringify(data)}\n`;
    }

    return message + '\n';
}

// ─── Event Types ─────────────────────────────────────────────────────────────

export const SSE_EVENTS = {
    // Booking lifecycle
    BOOKING_CREATED: 'booking:created',
    BOOKING_UPDATED: 'booking:updated',
    BOOKING_CANCELLED: 'booking:cancelled',
    BOOKING_CHECK_IN: 'booking:check_in',
    BOOKING_CHECK_OUT: 'booking:check_out',

    // Room events
    ROOM_STATUS_CHANGED: 'room:status_changed',
    ROOM_AVAILABLE: 'room:available',
    ROOM_OCCUPIED: 'room:occupied',
    ROOM_MAINTENANCE: 'room:maintenance',

    // Payment events
    PAYMENT_RECEIVED: 'payment:received',
    PAYMENT_PENDING: 'payment:pending',

    // Housekeeping events
    HOUSEKEEPING_UPDATE: 'housekeeping:update',
    ROOM_CLEANED: 'room:cleaned',

    // System events
    NIGHT_AUDIT_CLOSED: 'system:night_audit_closed',
    PROPERTY_ALERT: 'system:property_alert',

    // General
    HEARTBEAT: 'heartbeat',
    CONNECTED: 'connected',
    ERROR: 'error',
} as const;

// ─── Helper Functions for Broadcasting ──────────────────────────────────────

/**
 * Notify about a new booking for a property
 */
export async function notifyBookingCreated(
    propertyId: string,
    booking: {
        id: string;
        bookingNumber: string;
        guestName: string;
        roomNumber?: string;
        checkIn: string;
        checkOut: string;
    }
): Promise<void> {
    await broadcastToProperty(propertyId, SSE_EVENTS.BOOKING_CREATED, {
        type: 'BOOKING_CREATED',
        timestamp: new Date().toISOString(),
        data: booking,
    });
}

/**
 * Notify about a booking status change
 */
export async function notifyBookingStatusChange(
    propertyId: string,
    booking: {
        id: string;
        bookingNumber: string;
        oldStatus: string;
        newStatus: string;
    }
): Promise<void> {
    await broadcastToProperty(propertyId, SSE_EVENTS.BOOKING_UPDATED, {
        type: 'BOOKING_STATUS_CHANGE',
        timestamp: new Date().toISOString(),
        data: booking,
    });
}

/**
 * Notify about a room status change
 */
export async function notifyRoomStatusChange(
    propertyId: string,
    room: {
        id: string;
        roomNumber: string;
        oldStatus: string;
        newStatus: string;
    }
): Promise<void> {
    await broadcastToProperty(propertyId, SSE_EVENTS.ROOM_STATUS_CHANGED, {
        type: 'ROOM_STATUS_CHANGE',
        timestamp: new Date().toISOString(),
        data: room,
    });
}

/**
 * Notify admins about a payment received
 */
export async function notifyPaymentReceived(
    propertyId: string,
    payment: {
        id: string;
        bookingId: string;
        bookingNumber: string;
        amount: number;
        method: string;
    }
): Promise<void> {
    await broadcastToProperty(propertyId, SSE_EVENTS.PAYMENT_RECEIVED, {
        type: 'PAYMENT_RECEIVED',
        timestamp: new Date().toISOString(),
        data: payment,
    });
}

/**
 * Notify about night audit closure
 */
export async function notifyNightAuditClosed(
    propertyId: string,
    report: {
        date: string;
        closedBy: string;
        totalRevenue: number;
    }
): Promise<void> {
    await broadcastToProperty(propertyId, SSE_EVENTS.NIGHT_AUDIT_CLOSED, {
        type: 'NIGHT_AUDIT_CLOSED',
        timestamp: new Date().toISOString(),
        data: report,
    });

    // Also notify all admins
    await broadcastToAdmins(SSE_EVENTS.NIGHT_AUDIT_CLOSED, {
        type: 'NIGHT_AUDIT_CLOSED',
        timestamp: new Date().toISOString(),
        data: { ...report, propertyId },
    });
}

// ─── Redis Subscriber Factory ─────────────────────────────────────────────────

export function createSSERedisSubscriber(channel: string): SSERedisSubscriber {
    return new SSERedisSubscriber(channel);
}