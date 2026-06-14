// apps/admin/src/app/api/channels/[id]/test-connection/route.ts
// Test channel credentials/connection

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { z } from 'zod';
import { ChannelManager, channelRegistry, BookingComAdapter } from '@the-rooms/channel-manager';
import { ChannelName } from '@the-rooms/channel-manager';

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') throw new Error('Forbidden');
}

const testConnectionSchema = z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    propertyId: z.string().optional(),
    hotelId: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    endpoint: z.string().optional(),
});

// ─── POST /api/channels/[id]/test-connection ──────────────────────────────────

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = testConnectionSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors.map(e => e.message).join(', '), 'VALIDATION_ERROR');
        }

        // Get channel to determine adapter type
        const channel = await db.channel.findUnique({ where: { id } });
        if (!channel) {
            return notFound('Channel', 'NOT_FOUND');
        }

        // Use provided credentials or fall back to stored config
        const storedConfig = (channel.config as Record<string, string>) ?? {};
        const config = {
            apiKey: parsed.data.apiKey ?? storedConfig.apiKey,
            apiSecret: parsed.data.apiSecret ?? storedConfig.apiSecret,
            propertyId: parsed.data.propertyId ?? storedConfig.propertyId,
            hotelId: parsed.data.hotelId ?? storedConfig.hotelId,
            username: parsed.data.username ?? storedConfig.username,
            password: parsed.data.password ?? storedConfig.password,
            endpoint: parsed.data.endpoint ?? storedConfig.endpoint,
        };

        // Register adapter if not already registered
        if (!channelRegistry.has(channel.name as ChannelName)) {
            channelRegistry.register(channel.name as ChannelName, BookingComAdapter);
        }

        // Configure and test
        channelRegistry.configure(channel.name as ChannelName, config);

        const channelManager = new ChannelManager();
        const result = await channelManager.testConnection(id);

        return ok({
            success: result.success,
            message: result.message,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CHANNEL_TEST_CONNECTION]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
