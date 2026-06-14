// apps/admin/src/app/api/channels/[id]/sync/route.ts
// Trigger manual sync for a channel

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { ok, badRequest, serverError, notFound } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';
import { ChannelManager } from '@the-rooms/channel-manager';
import { SyncType } from '@the-rooms/channel-manager';

async function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error('Unauthorized');
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') throw new Error('Forbidden');
}

const syncRequestSchema = z.object({
    syncType: z.enum([
        'FULL_INVENTORY',
        'INCREMENTAL_INVENTORY',
        'RATE_UPDATE',
        'BOOKING_IMPORT',
        'BOOKING_UPDATE',
        'BOOKING_CANCEL',
    ]),
    startDate: z.string().datetime().optional(),
});

// ─── POST /api/channels/[id]/sync ─────────────────────────────────────────────

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = syncRequestSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors.map(e => e.message).join(', '), 'VALIDATION_ERROR');
        }

        const { syncType, startDate } = parsed.data;

        // Verify channel exists
        const channel = await db.channel.findUnique({ where: { id } });
        if (!channel) {
            return notFound('Channel', 'NOT_FOUND');
        }

        // Create sync log entry
        const syncLog = await db.syncLog.create({
            data: {
                channelId: id,
                syncType: syncType as SyncType,
                syncDirection: 'OUTBOUND',
                status: 'IN_PROGRESS',
                startedAt: new Date(),
            },
        });

        // Execute sync
        const channelManager = new ChannelManager();
        const result = await channelManager.executeSync(id, syncType as SyncType, {
            startDate: startDate ? new Date(startDate) : undefined,
        });

        // Update sync log with results
        await db.syncLog.update({
            where: { id: syncLog.id },
            data: {
                status: result.success ? 'COMPLETED' : (result.itemsFailed > 0 ? 'PARTIAL_FAILURE' : 'FAILED'),
                itemsTotal: result.itemsSynced + result.itemsFailed,
                itemsSynced: result.itemsSynced,
                itemsFailed: result.itemsFailed,
                errorMessage: result.errors.length > 0 ? result.errors[0]?.errorMessage : null,
                errorDetails: result.errors as object,
                completedAt: new Date(),
                durationMs: result.durationMs,
            },
        });

        // Audit log
        await createAuditLog({
            userId: session?.user?.email ?? null,
            action: 'SYNC',
            entity: 'channel',
            entityId: id,
            metadata: {
                syncType,
                success: result.success,
                itemsSynced: result.itemsSynced,
                itemsFailed: result.itemsFailed,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            syncLogId: syncLog.id,
            result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CHANNEL_SYNC_POST]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── GET /api/channels/[id]/sync ─────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        await requireAdmin(session);

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') ?? '10', 10);

        // Verify channel exists
        const channel = await db.channel.findUnique({ where: { id } });
        if (!channel) {
            return notFound('Channel', 'NOT_FOUND');
        }

        const syncLogs = await db.syncLog.findMany({
            where: { channelId: id },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return ok({ syncLogs });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal error';
        if (message === 'Unauthorized') {
            return badRequest('Unauthorized', 'UNAUTHORIZED');
        }
        if (message === 'Forbidden') {
            return badRequest('Access denied', 'FORBIDDEN');
        }
        console.error('[CHANNEL_SYNC_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}
