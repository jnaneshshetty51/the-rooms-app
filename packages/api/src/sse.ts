// packages/api/src/sse.ts
// Server-Sent Events utilities for real-time updates

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SSEClient {
    id: string;
    controller: ReadableStreamDefaultController<Uint8Array>;
    propertyId?: string;
    userId?: string;
    userRole?: string;
}

export interface SSEEvent {
    event: string;
    data: unknown;
    id?: string;
    retry?: number;
}

// ─── Client Management ────────────────────────────────────────────────────────

const clients = new Map<string, SSEClient>();

/**
 * Add a new SSE client connection
 */
export function addClient(client: SSEClient): void {
    clients.set(client.id, client);
    console.log(`[SSE] Client connected: ${client.id} (property: ${client.propertyId || 'all'}, role: ${client.userRole || 'unknown'})`);
}

/**
 * Remove an SSE client connection
 */
export function removeClient(id: string): void {
    const client = clients.get(id);
    if (client) {
        clients.delete(id);
        console.log(`[SSE] Client disconnected: ${id}`);
    }
}

/**
 * Get all connected clients
 */
export function getClients(): Map<string, SSEClient> {
    return clients;
}

/**
 * Get client count
 */
export function getClientCount(): number {
    return clients.size;
}

// ─── Broadcasting ─────────────────────────────────────────────────────────────

/**
 * Broadcast an event to clients subscribed to a specific property
 * If propertyId is not provided, broadcasts to all clients (global events)
 */
export function broadcast(propertyId: string | null, event: string, data: unknown): void {
    const message = formatSSEMessage(event, data);
    const encoder = new TextEncoder();

    clients.forEach((client) => {
        // Skip if client has a specific property filter and it doesn't match
        if (client.propertyId && propertyId && client.propertyId !== propertyId) {
            return;
        }

        try {
            client.controller.enqueue(encoder.encode(message));
        } catch (error) {
            console.error(`[SSE] Failed to send to client ${client.id}:`, error);
            removeClient(client.id);
        }
    });
}

/**
 * Broadcast to all clients regardless of property filter
 */
export function broadcastToAll(event: string, data: unknown): void {
    broadcast(null, event, data);
}

/**
 * Broadcast to all admins and super_admins across all properties
 */
export function broadcastToAdmins(event: string, data: unknown): void {
    const message = formatSSEMessage(event, data);
    const encoder = new TextEncoder();

    clients.forEach((client) => {
        if (client.userRole === "ADMIN" || client.userRole === "SUPER_ADMIN") {
            try {
                client.controller.enqueue(encoder.encode(message));
            } catch (error) {
                console.error(`[SSE] Failed to send to admin client ${client.id}:`, error);
                removeClient(client.id);
            }
        }
    });
}

// ─── Message Formatting ──────────────────────────────────────────────────────

/**
 * Format data as SSE message string
 */
export function formatSSEMessage(event: string, data: unknown, id?: string): string {
    let message = "";

    if (id) {
        message += `id: ${id}\n`;
    }

    message += `event: ${event}\n`;

    if (typeof data === "string") {
        message += `data: ${data}\n`;
    } else {
        message += `data: ${JSON.stringify(data)}\n`;
    }

    return message + "\n";
}

/**
 * Format a comment message (for heartbeat/keepalive)
 */
export function formatSSEComment(message: string): string {
    return `:${message}\n\n`;
}

// ─── Event Types ─────────────────────────────────────────────────────────────

// Booking events
export const SSE_EVENTS = {
    // Booking lifecycle
    BOOKING_CREATED: "booking:created",
    BOOKING_UPDATED: "booking:updated",
    BOOKING_CANCELLED: "booking:cancelled",
    BOOKING_CHECK_IN: "booking:check_in",
    BOOKING_CHECK_OUT: "booking:check_out",

    // Room events
    ROOM_STATUS_CHANGED: "room:status_changed",
    ROOM_AVAILABLE: "room:available",
    ROOM_OCCUPIED: "room:occupied",
    ROOM_MAINTENANCE: "room:maintenance",

    // Payment events
    PAYMENT_RECEIVED: "payment:received",
    PAYMENT_PENDING: "payment:pending",

    // Housekeeping events
    HOUSEKEEPING_UPDATE: "housekeeping:update",
    ROOM_CLEANED: "room:cleaned",

    // System events
    NIGHT_AUDIT_CLOSED: "system:night_audit_closed",
    PROPERTY_ALERT: "system:property_alert",

    // General
    HEARTBEAT: "heartbeat",
    CONNECTED: "connected",
    ERROR: "error",
} as const;

// ─── Property-Specific Events ─────────────────────────────────────────────────

/**
 * Notify about a new booking for a property
 */
export function notifyBookingCreated(propertyId: string, booking: {
    id: string;
    bookingNumber: string;
    guestName: string;
    roomNumber?: string;
    checkIn: string;
    checkOut: string;
}): void {
    broadcast(propertyId, SSE_EVENTS.BOOKING_CREATED, {
        type: "BOOKING_CREATED",
        timestamp: new Date().toISOString(),
        data: booking,
    });
}

/**
 * Notify about a booking status change
 */
export function notifyBookingStatusChange(propertyId: string, booking: {
    id: string;
    bookingNumber: string;
    oldStatus: string;
    newStatus: string;
}): void {
    broadcast(propertyId, SSE_EVENTS.BOOKING_UPDATED, {
        type: "BOOKING_STATUS_CHANGE",
        timestamp: new Date().toISOString(),
        data: booking,
    });
}

/**
 * Notify about a room status change
 */
export function notifyRoomStatusChange(propertyId: string, room: {
    id: string;
    roomNumber: string;
    oldStatus: string;
    newStatus: string;
}): void {
    broadcast(propertyId, SSE_EVENTS.ROOM_STATUS_CHANGED, {
        type: "ROOM_STATUS_CHANGE",
        timestamp: new Date().toISOString(),
        data: room,
    });
}

/**
 * Notify admins about a payment received
 */
export function notifyPaymentReceived(propertyId: string, payment: {
    id: string;
    bookingId: string;
    bookingNumber: string;
    amount: number;
    method: string;
}): void {
    broadcast(propertyId, SSE_EVENTS.PAYMENT_RECEIVED, {
        type: "PAYMENT_RECEIVED",
        timestamp: new Date().toISOString(),
        data: payment,
    });
}

/**
 * Notify about night audit closure
 */
export function notifyNightAuditClosed(propertyId: string, report: {
    date: string;
    closedBy: string;
    totalRevenue: number;
}): void {
    broadcast(propertyId, SSE_EVENTS.NIGHT_AUDIT_CLOSED, {
        type: "NIGHT_AUDIT_CLOSED",
        timestamp: new Date().toISOString(),
        data: report,
    });
    // Also notify all admins
    broadcastToAdmins(SSE_EVENTS.NIGHT_AUDIT_CLOSED, {
        type: "NIGHT_AUDIT_CLOSED",
        timestamp: new Date().toISOString(),
        data: { ...report, propertyId },
    });
}