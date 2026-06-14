// apps/admin/src/app/api/channels/[id]/route.ts
// Single channel CRUD operations

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') throw new Error('Forbidden');
}

const updateChannelSchema = z.object({
    displayName: z.string().min(1).optional(),
    logoUrl: z.string().url().optional(),
    isActive: z.boolean().optional(),
    config: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
});

const syncSettingsSchema = z.object({
    syncMode: z.enum(['PUSH_BASED', 'PULL_BASED', 'WEBHOOK_BASED', 'HYBRID']).optional(),
    fullSyncSchedule: z.string().optional(),
    incrementalSyncSchedule: z.string().optional(),
    autoSyncInventory: z.boolean().optional(),
    autoSyncRates: z.boolean().optional(),
    autoImportBookings: z.boolean().optional(),
    conflictStrategy: z.enum(['PMS_WINS', 'OTA_WINS', 'NEWEST_WINS', 'MANUAL']).optional(),
    pushEnabled: z.boolean().optional(),
    pushEndpoint: z.string().url().optional(),
    maxRetries: z.number().int().min(0).optional(),
    retryDelayMs: z.number().int().min(0).optional(),
});

// ─── GET /api/channels/[id] ────────────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;

        const channel = await db.channel.findUnique({
            where: { id },
            include: {
                syncSettings: true,
                roomMappings: { include: { roomType: true } },
                rateMappings: true,
            },
        });

        if (!channel) {
            return notFound('Channel', 'NOT_FOUND');
        }

        return ok({ channel });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CHANNEL_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── PATCH /api/channels/[id] ─────────────────────────────────────────────────

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateChannelSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors.map(e => e.message).join(', '), 'VALIDATION_ERROR');
        }

        const existing = await db.channel.findUnique({ where: { id } });
        if (!existing) {
            return notFound('Channel', 'NOT_FOUND');
        }

        const channel = await db.channel.update({
            where: { id },
            data: {
                displayName: parsed.data.displayName,
                logoUrl: parsed.data.logoUrl,
                isActive: parsed.data.isActive,
                config: parsed.data.config,
                metadata: parsed.data.metadata,
            },
            include: { syncSettings: true },
        });

        // Audit log
        await createAuditLog({
            userId: session?.user?.email ?? null,
            action: 'UPDATE',
            entity: 'channel',
            entityId: channel.id,
            metadata: { changes: Object.keys(parsed.data) },
            ipAddress: getClientIp(request),
        });

        return ok({ channel });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CHANNEL_PATCH]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── DELETE /api/channels/[id] ───────────────────────────────────────────────

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;

        const existing = await db.channel.findUnique({ where: { id } });
        if (!existing) {
            return notFound('Channel', 'NOT_FOUND');
        }

        // Delete related records first
        await db.$transaction([
            db.syncLog.deleteMany({ where: { channelId: id } }),
            db.channelSyncSettings.deleteMany({ where: { channelId: id } }),
            db.roomChannelMapping.deleteMany({ where: { channelId: id } }),
            db.rateChannelMapping.deleteMany({ where: { channelId: id } }),
            db.channel.delete({ where: { id } }),
        ]);

        // Audit log
        await createAuditLog({
            userId: session?.user?.email ?? null,
            action: 'DELETE',
            entity: 'channel',
            entityId: id,
            metadata: { channelName: existing.name },
            ipAddress: getClientIp(request),
        });

        return ok({ deleted: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CHANNEL_DELETE]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
