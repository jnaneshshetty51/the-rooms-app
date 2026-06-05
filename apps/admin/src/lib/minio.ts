import { Client } from 'minio';

let minioClient: Client | null = null;

export function getMinioClient(): Client {
  if (minioClient) return minioClient;

  // MINIO_ENDPOINT should be just the hostname, e.g. "localhost" or "minio.example.com"
  // MINIO_PORT defaults to 9000
  const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = parseInt(process.env.MINIO_PORT || '9000', 10);
  const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
  const useSSL = process.env.MINIO_USE_SSL === 'true';

  minioClient = new Client({ endPoint, port, accessKey, secretKey, useSSL });

  return minioClient;
}

export async function uploadRoomPhoto(
  roomId: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<string> {
  const client = getMinioClient();
  const bucket = process.env.MINIO_BUCKET || 'therooms-storage';
  // Sanitize filename: replace spaces and special chars so the key is URL-safe
  const safeName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  const key = `room-photos/${roomId}/${Date.now()}-${safeName}`;

  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, 'us-east-1');
  }
  // Ensure bucket is always public-read (idempotent)
  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${bucket}/*`],
    }],
  });
  await client.setBucketPolicy(bucket, policy);

  await client.putObject(bucket, key, fileBuffer);

  // Build a stable public URL using MINIO_PUBLIC_URL (e.g. https://minio.therooms.in)
  // If not set, fall back to a presigned URL
  const publicBase = process.env.MINIO_PUBLIC_URL;
  if (publicBase) {
    return `${publicBase.replace(/\/$/, '')}/${bucket}/${key}`;
  }

  // Fallback: presigned URL valid for 7 days
  return client.presignedGetObject(bucket, key, 7 * 24 * 60 * 60);
}
