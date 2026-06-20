// packages/db/src/lib/redis.ts
// Shared Redis client for cross-package usage

import Redis from 'ioredis';

// ─── Redis Client ─────────────────────────────────────────────────────────────

let redisClient: Redis | null = null;

function createRedisClient(): Redis | null {
    if (!process.env.REDIS_URL) {
        console.warn('[Redis] REDIS_URL not configured, Redis features disabled');
        return null;
    }

    const client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times: number) => (times > 1 ? null : Math.min(times * 100, 3000)),
        lazyConnect: true,
    });

    client.on('error', (err: Error) => {
        console.warn('[Redis] Connection error:', err.message);
    });

    client.on('connect', () => {
        console.log('[Redis] Connected successfully');
    });

    return client;
}

/**
 * Get the shared Redis client instance
 * Returns null if REDIS_URL is not configured
 */
export function getRedisClient(): Redis | null {
    if (!redisClient) {
        redisClient = createRedisClient();
    }
    return redisClient;
}

/**
 * Check if Redis is available and connected
 */
export function isRedisConnected(): boolean {
    return redisClient?.status === 'ready';
}

// ─── For direct export (convenience) ─────────────────────────────────────────

// Export a ready-to-use client that may be null
export const redis = {
    get client() {
        return getRedisClient();
    },

    async publish(channel: string, message: string): Promise<number> {
        const client = getRedisClient();
        if (!client) return 0;
        return client.publish(channel, message);
    },

    async subscribe(channel: string | string[], callback: (err: Error | null, result: number) => void): Promise<void> {
        const client = getRedisClient();
        if (!client) {
            callback(new Error('Redis not available'), 0);
            return;
        }
        await client.subscribe(channel, callback);
    },

    async unsubscribe(channel: string | string[]): Promise<void> {
        const client = getRedisClient();
        if (client) {
            await client.unsubscribe(channel);
        }
    },
};