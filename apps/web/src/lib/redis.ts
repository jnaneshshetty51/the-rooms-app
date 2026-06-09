import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;
  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    commandTimeout: 500,
    enableOfflineQueue: false,
    retryStrategy: () => null, // don't retry — fail fast
  });
  client.on('error', () => {
    // Redis unavailable — fail silently, fall through to DB
    client = null;
  });
  return client;
}
