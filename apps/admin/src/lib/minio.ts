import { Client } from 'minio';

let minioClient: Client | null = null;

export function getMinioClient(): Client {
  if (minioClient) return minioClient;

  const endpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
  const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
  const useSSL = process.env.MINIO_USE_SSL !== 'false';

  minioClient = new Client({
    endPoint: endpoint,
    accessKey,
    secretKey,
    useSSL,
  });

  return minioClient;
}

export async function uploadRoomPhoto(
  roomId: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<string> {
  const client = getMinioClient();
  const bucket = process.env.MINIO_BUCKET || 'therooms-storage';
  const key = `room-photos/${roomId}/${Date.now()}-${fileName}`;

  // Ensure bucket exists
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, 'us-east-1');
  }

  // Upload file
  await client.putObject(bucket, key, fileBuffer);

  // Generate presigned URL (valid for 7 days)
  const url = await client.presignedGetObject(bucket, key, 7 * 24 * 60 * 60);

  return url;
}
