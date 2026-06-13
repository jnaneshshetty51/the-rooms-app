import { Client } from 'minio';

let minioClient: Client | null = null;

// ─── File Upload Security Constants ────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const MAGIC_BYTES: Record<string, { signatures: number[][], offset: number }> = {
  'image/jpeg': { signatures: [[0xFF, 0xD8, 0xFF]], offset: 0 },
  'image/png': { signatures: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], offset: 0 },
  'image/webp': { signatures: [[0x52, 0x49, 0x46, 0x46]], offset: 0 }, // RIFF header
  'application/pdf': { signatures: [[0x25, 0x50, 0x44, 0x46]], offset: 0 }, // %PDF
};

// ─── Validation Helpers ─────────────────────────────────────────────────────

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

function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop() ?? fileName;
  const clean = baseName.replace(/[\x00-\x1F\x7F]/g, '');
  const safe = clean.replace(/[^a-zA-Z0-9._-]/g, '_');
  const noTraversal = safe.replace(/\.{2,}/g, '.');
  return noTraversal.substring(0, 255);
}

function validateFile(buffer: Buffer, _fileName: string): { valid: boolean; error?: string; detectedMime?: string } {
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 5MB' };
  }
  if (buffer.length < 8) {
    return { valid: false, error: 'File too small to be valid' };
  }
  const detectedMime = detectMimeType(buffer);
  if (!detectedMime) {
    return { valid: false, error: 'Invalid file format. Only JPEG, PNG, WebP, and PDF are allowed' };
  }
  if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
    return { valid: false, error: 'File type not allowed' };
  }
  return { valid: true, detectedMime };
}

// ─── MinIO Client ────────────────────────────────────────────────────────────

function getMinioClient(): Client {
  if (minioClient) return minioClient;

  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error('MinIO credentials not configured. Set MINIO_ACCESS_KEY and MINIO_SECRET_KEY.');
  }

  minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey,
    secretKey,
    useSSL: process.env.MINIO_USE_SSL === 'true',
  });
  return minioClient;
}

// ─── Upload Function ─────────────────────────────────────────────────────────

export async function uploadGuestDoc(
  guestId: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<string> {
  const validation = validateFile(fileBuffer, fileName);
  if (!validation.valid) {
    throw new Error(`File validation failed: ${validation.error}`);
  }

  const client = getMinioClient();
  const bucket = process.env.MINIO_BUCKET || 'therooms-storage';
  const safeName = sanitizeFileName(fileName);
  const key = `guest-docs/${guestId}/${Date.now()}-${safeName}`;

  const exists = await client.bucketExists(bucket);
  if (!exists) await client.makeBucket(bucket, 'us-east-1');

  await client.putObject(bucket, key, fileBuffer, fileBuffer.length, {
    'Content-Type': validation.detectedMime!,
  });

  const publicBase = (process.env.MINIO_PUBLIC_URL || '').replace(/\/$/, '');
  if (publicBase) {
    return `${publicBase}/${bucket}/${key}`;
  }
  // Fallback: presigned URL valid for 7 days
  return client.presignedGetObject(bucket, key, 7 * 24 * 60 * 60);
}
