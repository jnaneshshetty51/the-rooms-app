// apps/admin/src/app/api/admin/storage/cleanup/route.ts
// Storage cleanup API - SUPER_ADMIN only

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { ok, badRequest, serverError } from '@the-rooms/api/response';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { getMinioClient, deleteObject } from '@/lib/minio';
import { findOrphanFiles, cleanupOrphanFiles } from '@the-rooms/db';
import { z } from 'zod';

// ─── Validation Schema ─────────────────────────────────────────────────────────

const querySchema = z.object({
    dryRun: z.enum(['true', 'false']).optional().default('true'),
    olderThanDays: z.string().transform(Number).pipe(z.number().min(1).max(365)).optional().default('7'),
});

// ─── Helper Types ─────────────────────────────────────────────────────────────

interface OrphanFile {
    storageKey: string;
    size: number;
    lastModified: Date;
    modelType: string | null;
    modelId: string | null;
}

interface CleanupResult {
    deletedCount: number;
    failedCount: number;
    errors: string[];
    deletedFiles: string[];
}

// ─── Route Handlers ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        // ─── Auth Check ─────────────────────────────────────────────────────────────
        const session = await auth();
        if (!session?.user) {
            return badRequest('Authentication required', 'UNAUTHORIZED');
        }

        if (session.user.role !== 'SUPER_ADMIN') {
            return badRequest('SUPER_ADMIN access required', 'FORBIDDEN');
        }

        // ─── Parse Query Params ────────────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const rawDryRun = searchParams.get('dryRun') ?? 'true';
        const rawOlderThanDays = searchParams.get('olderThanDays') ?? '7';

        const parseResult = querySchema.safeParse({
            dryRun: rawDryRun,
            olderThanDays: rawOlderThanDays,
        });

        if (!parseResult.success) {
            return badRequest(parseResult.error.errors[0]?.message ?? 'Invalid parameters', 'VALIDATION_ERROR');
        }

        const { dryRun, olderThanDays } = parseResult.data;
        const isDryRun = dryRun === 'true';

        // ─── Find Orphan Files ──────────────────────────────────────────────────────
        const bucket = process.env.MINIO_BUCKET || 'therooms-storage';
        const minioClient = getMinioClient();

        const orphans = await findOrphanFiles(bucket, olderThanDays, minioClient);

        // ─── Return Dry Run Results ────────────────────────────────────────────────
        if (isDryRun) {
            return ok({
                mode: 'dry_run',
                olderThanDays,
                totalOrphans: orphans.length,
                totalSize: orphans.reduce((sum, f) => sum + f.size, 0),
                files: orphans.map((f) => ({
                    storageKey: f.storageKey,
                    size: f.size,
                    lastModified: f.lastModified,
                    modelType: f.modelType,
                    modelId: f.modelId,
                })),
            });
        }

        // ─── Execute Cleanup ────────────────────────────────────────────────────────
        const result: CleanupResult = {
            deletedCount: 0,
            failedCount: 0,
            errors: [],
            deletedFiles: [],
        };

        for (const file of orphans) {
            try {
                await deleteObject(bucket, file.storageKey);
                result.deletedFiles.push(file.storageKey);
                result.deletedCount++;
            } catch (error) {
                result.failedCount++;
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                result.errors.push(`Failed to delete ${file.storageKey}: ${errorMsg}`);
            }
        }

        // ─── Audit Log ─────────────────────────────────────────────────────────────
        await createAuditLog({
            userId: session.user.id,
            action: 'STORAGE_CLEANUP',
            entity: 'storage',
            metadata: {
                mode: 'live',
                olderThanDays,
                deletedCount: result.deletedCount,
                failedCount: result.failedCount,
                totalOrphansFound: orphans.length,
            },
            ipAddress: getClientIp(request),
        });

        return ok({
            mode: 'live',
            olderThanDays,
            deletedCount: result.deletedCount,
            failedCount: result.failedCount,
            errors: result.errors,
            deletedFiles: result.deletedFiles,
        });
    } catch (error) {
        console.error('[STORAGE_CLEANUP_GET]', error);
        return serverError();
    }
}
