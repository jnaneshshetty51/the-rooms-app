import { Client } from 'minio';

let minioClient: Client | null = null;

function getMinioClient(): Client {
  if (minioClient) return minioClient;
  minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  });
  return minioClient;
}

export async function uploadGuestDoc(
  guestId: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<string> {
  const client = getMinioClient();
  const bucket = process.env.MINIO_BUCKET || 'therooms-storage';
  const safeName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  const key = `guest-docs/${guestId}/${Date.now()}-${safeName}`;

  const exists = await client.bucketExists(bucket);
  if (!exists) await client.makeBucket(bucket, 'us-east-1');

  await client.putObject(bucket, key, fileBuffer);

  const publicBase = (process.env.MINIO_PUBLIC_URL || 'https://admin.therooms.in/media').replace(/\/$/, '');
  return `${publicBase}/${bucket}/${key}`;
}
