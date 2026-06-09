import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;
  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    commandTimeout: 500,
    retryStrategy: () => null, // don't retry on failure
  });
  client.on('error', (err) => {
    // Redis unavailable — reset so next request gets a fresh client
    console.error('[Redis] connection error, disabling cache:', err.message);
    client = null;
  });
  return client;
}
