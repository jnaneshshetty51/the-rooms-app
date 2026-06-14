// apps/admin/src/app/api/channels/route.ts
// Channel management API routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, created, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { ChannelName, SyncMode, ConflictStrategy } from '@the-rooms/channel-manager';

// ─── Channel Lookup ─────────────────────────────────────────────────────────────

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') throw new Error('Forbidden');
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const channelConfigSchema = z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    propertyId: z.string().optional(),
    hotelId: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    endpoint: z.string().optional(),
    webhookSecret: z.string().optional(),
});

const createChannelSchema = z.object({
    name: z.nativeEnum(ChannelName),
    displayName: z.string().min(1),
    logoUrl: z.string().url().optional(),
    config: channelConfigSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
});

const updateChannelSchema = z.object({
    displayName: z.string().min(1).optional(),
    logoUrl: z.string().url().optional(),
    isActive: z.boolean().optional(),
    config: channelConfigSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
});

const syncSettingsSchema = z.object({
    syncMode: z.nativeEnum(SyncMode).optional(),
    fullSyncSchedule: z.string().optional(),
    incrementalSyncSchedule: z.string().optional(),
    autoSyncInventory: z.boolean().optional(),
    autoSyncRates: z.boolean().optional(),
    autoImportBookings: z.boolean().optional(),
    conflictStrategy: z.nativeEnum(ConflictStrategy).optional(),
    pushEnabled: z.boolean().optional(),
    pushEndpoint: z.string().url().optional(),
    maxRetries: z.number().int().min(0).optional(),
    retryDelayMs: z.number().int().min(0).optional(),
});

// ─── GET /api/channels ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';
        const withSyncSettings = searchParams.get('withSyncSettings') === 'true';

        const where = includeInactive ? {} : { isActive: true };

        const channels = await db.channel.findMany({
            where,
            include: withSyncSettings ? { syncSettings: true } : undefined,
            orderBy: { name: 'asc' },
        });

        return ok({ channels });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CHANNELS_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST /api/channels ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const body = await request.json();
        const parsed = createChannelSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors.map(e => e.message).join(', '), 'VALIDATION_ERROR');
        }

        const { name, displayName, logoUrl, config, metadata } = parsed.data;

        // Check if channel already exists
        const existing = await db.channel.findUnique({ where: { name } });
        if (existing) {
            return badRequest('Channel already exists', 'CONFLICT');
        }

        const channel = await db.channel.create({
            data: {
                name,
                displayName,
                logoUrl,
                config: config as object,
                metadata: metadata as object,
            },
            include: { syncSettings: true },
        });

        // Create default sync settings
        await db.channelSyncSettings.create({
            data: {
                channelId: channel.id,
                syncMode: 'PUSH_BASED',
                autoSyncInventory: true,
                autoSyncRates: true,
                autoImportBookings: true,
                conflictStrategy: 'PMS_WINS',
                maxRetries: 3,
                retryDelayMs: 5000,
            },
        });

        // Audit log
        await createAuditLog({
            userId: session?.user?.email ?? null,
            action: 'CREATE',
            entity: 'channel',
            entityId: channel.id,
            metadata: { channelName: name },
            ipAddress: getClientIp(request),
        });

        return created({ channel }, { page: 1, pageSize: 1, total: 1 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CHANNELS_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
