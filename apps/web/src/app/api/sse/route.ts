// apps/web/src/app/api/sse/route.ts
// Server-Sent Events endpoint for real-time updates (Redis-backed)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import {
    addClient,
    removeClient,
    formatSSEMessage,
    SSE_EVENTS,
    getClientCount,
    sseEmitter,
    createSSERedisSubscriber,
    SSERoomMessage,
} from '@the-rooms/api/sse-redis';
import { getPropertyIdFromSession } from '@the-rooms/api/middleware';

// ─── SSE Connection Endpoint ──────────────────────────────────────────────────

/**
 * GET /api/sse
 * Establish SSE connection for real-time updates
 *
 * Query parameters:
 * - propertyId (optional): Subscribe to updates for a specific property
 *
 * Headers required:
 * - Authorization: Bearer token (session cookie also works)
 */
export async function GET(request: NextRequest) {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const userRole = (session.user as { role?: string }).role || 'GUEST';
    const propertyId = (await getPropertyIdFromSession(session)) || undefined;

    // Optional property filter from query params
    const searchParams = request.nextUrl.searchParams;
    const subscribePropertyId = searchParams.get('propertyId') || propertyId;

    // Generate unique client ID
    const clientId = `sse-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create SSE stream
    const encoder = new TextEncoder();

    // Track cleanup references
    let redisSubscriber: ReturnType<typeof createSSERedisSubscriber> | null = null;
    let localMessageHandler: ((message: SSERoomMessage) => void) | null = null;

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            // Register client
            const client = {
                id: clientId,
                controller,
                propertyId: subscribePropertyId || undefined,
                userId,
                userRole,
            };
            addClient(client);

            // Send initial connection message
            const connectedEvent = formatSSEMessage(SSE_EVENTS.CONNECTED, {
                clientId,
                userId,
                userRole,
                propertyId: subscribePropertyId,
                timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(connectedEvent));

            // ─── Local EventEmitter handler (same-server) ───────────────────────
            localMessageHandler = (message: SSERoomMessage) => {
                // Filter by property if specified
                if (subscribePropertyId && message.propertyId && message.propertyId !== subscribePropertyId) {
                    return;
                }

                try {
                    const data = `event: ${message.type}\ndata: ${JSON.stringify(message.data)}\n\n`;
                    controller.enqueue(encoder.encode(data));
                } catch (error) {
                    console.error(`[SSE] Failed to send local message to client ${clientId}:`, error);
                }
            };

            // Subscribe to local emitter
            sseEmitter.on('message', localMessageHandler);

            // ─── Redis Subscriber (cross-server) ───────────────────────────────
            const channel = subscribePropertyId
                ? `sse:system:${subscribePropertyId}`
                : 'sse:system';

            redisSubscriber = createSSERedisSubscriber(channel);

            // Start Redis subscription (async, don't await)
            redisSubscriber.subscribe((message: SSERoomMessage) => {
                // Filter by property if specified
                if (subscribePropertyId && message.propertyId && message.propertyId !== subscribePropertyId) {
                    return;
                }

                try {
                    const data = `event: ${message.type}\ndata: ${JSON.stringify(message.data)}\n\n`;
                    controller.enqueue(encoder.encode(data));
                } catch (error) {
                    console.error(`[SSE] Failed to send Redis message to client ${clientId}:`, error);
                }
            }).catch((error) => {
                console.warn(`[SSE] Redis subscription failed for channel ${channel}:`, error);
            });

            console.log(`[SSE] Client ${clientId} connected. Total clients: ${getClientCount()}`);
        },

        cancel() {
            // Client disconnected - cleanup
            removeClient(clientId);

            // Unsubscribe from local emitter
            if (localMessageHandler) {
                sseEmitter.off('message', localMessageHandler);
            }

            // Unsubscribe from Redis
            if (redisSubscriber) {
                redisSubscriber.unsubscribe().catch((error) => {
                    console.warn(`[SSE] Failed to unsubscribe Redis channel for ${clientId}:`, error);
                });
            }

            console.log(`[SSE] Client ${clientId} disconnected. Total clients: ${getClientCount()}`);
        },
    });

    // Return SSE response
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering if present
        },
    });
}

// ─── POST: Send Test Event (Development Only) ─────────────────────────────────

/**
 * POST /api/sse
 * Send a test event to all connected clients (development only)
 * In production, events are triggered by business logic (booking created, payment received, etc.)
 */
export async function POST(request: NextRequest) {
    // Verify authentication - only admins can send test events
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { event, data, propertyId } = body;

        if (!event) {
            return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
        }

        // Import broadcast functions dynamically to avoid circular dependency issues
        const { broadcastToProperty, broadcastToAll } = await import('@the-rooms/api/sse-redis');

        const eventData = {
            ...data,
            _sentAt: new Date().toISOString(),
            _sentBy: (session.user as { id: string }).id,
        };

        if (propertyId) {
            await broadcastToProperty(propertyId, event, eventData);
        } else {
            await broadcastToAll(event, eventData);
        }

        return NextResponse.json({
            success: true,
            message: `Event "${event}" sent to clients`,
            clientCount: getClientCount(),
        });
    } catch (error) {
        console.error('[SSE] Error sending test event:', error);
        return NextResponse.json({ error: 'Failed to send event' }, { status: 500 });
    }
}