// packages/db/src/queries/storageQueries.ts
// Storage queries for orphan file cleanup and file hash management

import { db } from '../index';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OrphanFile {
    storageKey: string;
    size: number;
    lastModified: Date;
    modelType: string | null;
    modelId: string | null;
}

export interface CleanupResult {
    deletedCount: number;
    failedCount: number;
    errors: string[];
    deletedFiles: string[];
}

// ─── File Hash Management ───────────────────────────────────────────────────────

/**
 * Create or update a file hash entry for deduplication
 */
export async function upsertFileHash(params: {
    hash: string;
    storageKey: string;
    size: number;
    mimeType?: string;
    modelType: string;
    modelId?: string;
}) {
    return db.fileHash.upsert({
        where: { hash: params.hash },
        create: {
            hash: params.hash,
            storageKey: params.storageKey,
            size: params.size,
            mimeType: params.mimeType,
            modelType: params.modelType,
            modelId: params.modelId,
        },
        update: {
            storageKey: params.storageKey,
            size: params.size,
            mimeType: params.mimeType,
            modelType: params.modelType,
            modelId: params.modelId,
        },
    });
}

/**
 * Find an existing file by hash (for deduplication)
 */
export async function findFileHashByHash(hash: string) {
    return db.fileHash.findUnique({
        where: { hash },
    });
}

/**
 * Delete file hash entry
 */
export async function deleteFileHash(hash: string) {
    return db.fileHash.delete({
        where: { hash },
    });
}

/**
 * Get all file hashes for a specific model
 */
export async function getFileHashesByModel(modelType: string, modelId: string) {
    return db.fileHash.findMany({
        where: { modelType, modelId },
    });
}

// ─── Orphan File Detection ─────────────────────────────────────────────────────

/**
 * Get all storage keys referenced in the database across all models.
 * Returns URL-based keys from models that have url fields.
 */
async function getAllDbStorageKeys(): Promise<Set<string>> {
    const storageKeys = new Set<string>();

    // RoomPhoto URLs
    const roomPhotos = await db.roomPhoto.findMany({ select: { url: true } });
    roomPhotos.forEach((p) => { if (p.url) storageKeys.add(p.url); });

    // GuestDocument URLs
    const guestDocs = await db.guestDocument.findMany({ select: { frontUrl: true, backUrl: true } });
    guestDocs.forEach((d) => {
        if (d.frontUrl) storageKeys.add(d.frontUrl);
        if (d.backUrl) storageKeys.add(d.backUrl);
    });

    // FileHash storageKey
    const fileHashes = await db.fileHash.findMany({ select: { storageKey: true } });
    fileHashes.forEach((f) => { if (f.storageKey) storageKeys.add(f.storageKey); });

    return storageKeys;
}

/**
 * Find orphan files in MinIO bucket that don't have corresponding DB records.
 * Objects are considered orphans only if they're older than `olderThanDays` days
 * to avoid catching files that are recently uploaded but not yet recorded in DB.
 * 
 * @param bucket - MinIO bucket name
 * @param olderThanDays - Only consider objects older than this many days as potential orphans
 * @param minioClient - MinIO client instance
 * @returns List of orphan files with metadata
 */
export async function findOrphanFiles(
    bucket: string,
    olderThanDays: number = 7,
    minioClient: { listObjects: (bucket: string, prefix?: string, recursive?: boolean) => AsyncIterable<{ name: string; size: number; lastModified: Date }> }
): Promise<OrphanFile[]> {
    const dbKeys = await getAllDbStorageKeys();
    const orphans: OrphanFile[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
        // List all objects in the bucket
        const objects = minioClient.listObjects(bucket, '', true);

        for await (const obj of objects) {
            // Skip if object is newer than cutoff date
            if (obj.lastModified && obj.lastModified > cutoffDate) {
                continue;
            }

            // Check if this key is referenced in any DB table
            if (!dbKeys.has(obj.name)) {
                // Try to determine the model type from the storage key path
                let modelType: string | null = null;
                let modelId: string | null = null;

                if (obj.name.startsWith('room-photos/')) {
                    modelType = 'RoomPhoto';
                    // Extract potential room ID from path like room-photos/{roomId}/{filename}
                    const parts = obj.name.split('/');
                    if (parts.length >= 2) {
                        modelId = parts[1];
                    }
                } else if (obj.name.startsWith('room-type-images/')) {
                    modelType = 'RoomTypeImage';
                } else if (obj.name.startsWith('guest-documents/')) {
                    modelType = 'GuestDocument';
                } else if (obj.name.startsWith('invoices/')) {
                    modelType = 'Invoice';
                } else if (obj.name.startsWith('receipts/')) {
                    modelType = 'Receipt';
                }

                orphans.push({
                    storageKey: obj.name,
                    size: obj.size,
                    lastModified: obj.lastModified || new Date(),
                    modelType,
                    modelId,
                });
            }
        }
    } catch (error) {
        console.error('[STORAGE_QUERIES] Error listing MinIO objects:', error);
        throw error;
    }

    return orphans;
}

/**
 * Delete orphan files from MinIO storage.
 * 
 * @param bucket - MinIO bucket name
 * @param orphanFiles - List of orphan files to delete
 * @param dryRun - If true, only simulate deletion without actually removing files
 * @param minioClient - MinIO client instance
 * @param fileHashClient - Optional Prisma client for cleaning up FileHash entries
 * @returns Cleanup result with counts and any errors
 */
export async function cleanupOrphanFiles(
    bucket: string,
    orphanFiles: OrphanFile[],
    dryRun: boolean = true,
    minioClient: { removeObject: (bucket: string, key: string) => Promise<void> },
    fileHashClient?: unknown
): Promise<CleanupResult> {
    const result: CleanupResult = {
        deletedCount: 0,
        failedCount: 0,
        errors: [],
        deletedFiles: [],
    };

    for (const file of orphanFiles) {
        try {
            if (!dryRun) {
                // Delete from MinIO
                await minioClient.removeObject(bucket, file.storageKey);

                // Clean up FileHash entry if exists
                const fileHashes = await db.fileHash.findMany({
                    where: { storageKey: file.storageKey },
                });
                for (const fh of fileHashes) {
                    await db.fileHash.delete({ where: { hash: fh.hash } });
                }

                result.deletedFiles.push(file.storageKey);
            }
            result.deletedCount++;
        } catch (error) {
            result.failedCount++;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(`Failed to delete ${file.storageKey}: ${errorMsg}`);
        }
    }

    return result;
}

/**
 * Get storage statistics
 */
export async function getStorageStats() {
    const [
        totalRoomPhotos,
        totalRoomTypeImages,
        totalGuestDocuments,
        totalInvoices,
        totalReceipts,
        totalFileHashes,
    ] = await Promise.all([
        db.roomPhoto.count(),
        db.roomTypeImage.count(),
        db.guestDocument.count(),
        db.invoice.count(),
        db.receipt.count(),
        db.fileHash.count(),
    ]);

    return {
        totalRoomPhotos,
        totalRoomTypeImages,
        totalGuestDocuments,
        totalInvoices,
        totalReceipts,
        totalFileHashes,
    };
}
