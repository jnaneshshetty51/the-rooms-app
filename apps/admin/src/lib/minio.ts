import { Client } from 'minio';
import crypto from 'crypto';
import prisma from '@the-rooms/db';

let minioClient: Client | null = null;

// ─── File Upload Security Constants ────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ─── File Hash Types ─────────────────────────────────────────────────────────

export interface FileHashEntry {
  hash: string;
  storageKey: string;
  size: number;
  mimeType: string | null;
}

// Magic bytes for image validation
const MAGIC_BYTES: Record<string, { signatures: number[][], offset: number }> = {
  'image/jpeg': { signatures: [[0xFF, 0xD8, 0xFF]], offset: 0 },
  'image/png': { signatures: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], offset: 0 },
  'image/webp': { signatures: [[0x52, 0x49, 0x46, 0x46]], offset: 0 }, // RIFF....WEBP
};

// ─── File Validation Functions ──────────────────────────────────────────────

/**
 * Validate MIME type by checking magic bytes (file signature)
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const config = MAGIC_BYTES[mimeType];
  if (!config) return false;

  return config.signatures.some(sig => {
    return sig.every((byte, i) => buffer[config.offset + i] === byte);
  });
}

/**
 * Detect MIME type from magic bytes
 */
function detectMimeType(buffer: Buffer): string | null {
  for (const [mimeType, config] of Object.entries(MAGIC_BYTES)) {
    if (config.signatures.some(sig =>
      sig.every((byte, i) => buffer[config.offset + i] === byte)
    )) {
      return mimeType;
    }
  }
  return null;
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
function sanitizeFileName(fileName: string): string {
  // Remove all path components, keep only base filename
  const baseName = fileName.split(/[/\\]/).pop() ?? fileName;

  // Remove null bytes and control characters
  const clean = baseName.replace(/[\x00-\x1F\x7F]/g, '');

  // Only allow alphanumeric, underscore, hyphen, and dot
  const safe = clean.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Remove any remaining .. sequences
  const noTraversal = safe.replace(/\.{2,}/g, '.');

  // Limit length to 255 characters
  return noTraversal.substring(0, 255);
}

/**
 * Validate file for upload - checks size, magic bytes, and filename
 */
function validateFile(buffer: Buffer, fileName: string, expectedMimeType?: string): { valid: boolean; error?: string; detectedMime?: string } {
  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 5MB' };
  }

  if (buffer.length < 12) {
    return { valid: false, error: 'File too small to be a valid image' };
  }

  // Detect actual MIME type from magic bytes
  const detectedMime = detectMimeType(buffer);
  if (!detectedMime) {
    return { valid: false, error: 'Invalid file format. Only JPEG, PNG, and WebP are allowed' };
  }

  // If expected type provided, verify it matches
  if (expectedMimeType && detectedMime !== expectedMimeType) {
    return { valid: false, error: `File type mismatch. Expected ${expectedMimeType}, detected ${detectedMime}` };
  }

  // Verify magic bytes match allowed types
  if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
    return { valid: false, error: 'File type not allowed. Only JPEG, PNG, and WebP are allowed' };
  }

  return { valid: true, detectedMime };
}

// ─── MinIO Client Initialization ─────────────────────────────────────────────

export function getMinioClient(): Client {
  if (minioClient) return minioClient;

  // MINIO_ENDPOINT should be just the hostname, e.g. "localhost" or "minio.example.com"
  // MINIO_PORT defaults to 9000
  const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = parseInt(process.env.MINIO_PORT || '9000', 10);

  // L1: Fail fast if credentials are not configured (no defaults)
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('MinIO credentials not configured. Set MINIO_ACCESS_KEY and MINIO_SECRET_KEY environment variables.');
  }

  const useSSL = process.env.MINIO_USE_SSL === 'true';

  minioClient = new Client({ endPoint, port, accessKey, secretKey, useSSL });

  return minioClient;
}

// ─── Upload Functions ────────────────────────────────────────────────────────

export async function uploadRoomPhoto(
  roomId: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<string> {
  // Validate file before upload
  const validation = validateFile(fileBuffer, fileName, 'image/jpeg');
  if (!validation.valid) {
    throw new Error(`File validation failed: ${validation.error}`);
  }

  const client = getMinioClient();
  const bucket = process.env.MINIO_BUCKET || 'therooms-storage';
  // Sanitize filename: prevent path traversal, limit length
  const safeName = sanitizeFileName(fileName);
  const key = `room-photos/${roomId}/${Date.now()}-${safeName}`;

  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, 'us-east-1');
  }
  // NOTE: Bucket remains private - use getPresignedUrl() to access files

  await client.putObject(bucket, key, fileBuffer);

  // Return presigned URL for private access (15 minutes expiry)
  return client.presignedGetObject(bucket, key, 15 * 60);
}

// ─── Presigned URL Export ─────────────────────────────────────────────────────

/**
 * Generate a presigned URL for private file access
 * @param bucket - MinIO bucket name
 * @param key - Object key (file path in bucket)
 * @param expiry - URL expiry in seconds (default: 15 minutes)
 */
export async function getPresignedUrl(
  bucket: string,
  key: string,
  expiry: number = 15 * 60
): Promise<string> {
  const client = getMinioClient();
  return client.presignedGetObject(bucket, key, expiry);
}

/**
 * Delete an object from MinIO storage
 * @param bucket - MinIO bucket name
 * @param key - Object key (file path in bucket)
 */
export async function deleteObject(
  bucket: string,
  key: string
): Promise<void> {
  const client = getMinioClient();
  await client.removeObject(bucket, key);
}

export async function uploadRoomTypeImage(
  roomType: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<string> {
  // Validate file before upload
  const validation = validateFile(fileBuffer, fileName, 'image/jpeg');
  if (!validation.valid) {
    throw new Error(`File validation failed: ${validation.error}`);
  }

  const client = getMinioClient();
  const bucket = process.env.MINIO_BUCKET || 'therooms-storage';
  const safeName = sanitizeFileName(fileName);
  const key = `room-type-images/${roomType.toLowerCase()}/${Date.now()}-${safeName}`;

  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, 'us-east-1');
  }
  // NOTE: Bucket remains private - use getPresignedUrl() to access files

  await client.putObject(bucket, key, fileBuffer);

  // Return presigned URL for private access (15 minutes expiry)
  return client.presignedGetObject(bucket, key, 15 * 60);
}

// ─── File Hashing & Deduplication ──────────────────────────────────────────────

/**
 * Compute SHA-256 hash of file content
 * @param buffer - File content as Buffer
 * @returns Hex-encoded SHA-256 hash
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Find an existing file by its content hash
 * @param hash - SHA-256 hash of file content
 * @returns FileHash entry if found, null otherwise
 */
export async function findExistingFileByHash(hash: string): Promise<FileHashEntry | null> {
  const entry = await prisma.fileHash.findUnique({
    where: { hash },
  });
  return entry;
}

/**
 * Record a file hash entry for deduplication tracking
 * @param params - Hash entry parameters
 */
export async function recordFileHash(params: {
  hash: string;
  storageKey: string;
  size: number;
  mimeType?: string;
  modelType: string;
  modelId?: string;
}): Promise<void> {
  await prisma.fileHash.upsert({
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
 * Upload a room photo with automatic deduplication.
 * If a file with the same content hash already exists, returns the existing URL.
 * Otherwise, uploads the new file and records its hash.
 * 
 * @param roomId - Room ID
 * @param fileName - Original filename
 * @param fileBuffer - File content
 * @returns Object with url and storageKey (and isDupe flag if file was deduplicated)
 */
export async function uploadRoomPhotoWithDeduplication(
  roomId: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<{ url: string; storageKey: string; isDupe: boolean }> {
  // Validate file before upload
  const validation = validateFile(fileBuffer, fileName, 'image/jpeg');
  if (!validation.valid) {
    throw new Error(`File validation failed: ${validation.error}`);
  }

  const client = getMinioClient();
  const bucket = process.env.MINIO_BUCKET || 'therooms-storage';
  const safeName = sanitizeFileName(fileName);

  // Compute hash for deduplication
  const hash = computeFileHash(fileBuffer);

  // Check for existing file with same hash
  const existing = await findExistingFileByHash(hash);
  if (existing) {
    // File already exists - return existing URL
    const url = await client.presignedGetObject(bucket, existing.storageKey, 15 * 60);
    return { url, storageKey: existing.storageKey, isDupe: true };
  }

  // New file - upload to MinIO
  const key = `room-photos/${roomId}/${Date.now()}-${safeName}`;

  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, 'us-east-1');
  }

  await client.putObject(bucket, key, fileBuffer);

  // Record hash for future deduplication
  await recordFileHash({
    hash,
    storageKey: key,
    size: fileBuffer.length,
    mimeType: validation.detectedMime,
    modelType: 'RoomPhoto',
    modelId: roomId,
  });

  // Return presigned URL for private access (15 minutes expiry)
  const url = await client.presignedGetObject(bucket, key, 15 * 60);
  return { url, storageKey: key, isDupe: false };
}

/**
 * Remove a file hash entry (call when deleting a file)
 * @param hash - SHA-256 hash of the file
 */
export async function removeFileHash(hash: string): Promise<void> {
  await prisma.fileHash.delete({
    where: { hash },
  });
}
