// packages/db/src/queries/cacheQueries.ts
// Redis caching layer for frequently accessed data

import prisma from '../index';
import Redis from 'ioredis';

// ─── Redis Client ─────────────────────────────────────────────────────────────

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
    if (redisClient) return redisClient;

    if (process.env.REDIS_URL) {
        redisClient = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            retryStrategy: (times: number) => (times > 1 ? null : Math.min(times * 100, 3000)),
            lazyConnect: true,
        });

        redisClient.on('error', (err: Error) => {
            console.warn('[Redis] Connection error in cacheQueries:', err.message);
        });
    }

    return redisClient;
}

// ─── Cache Constants ───────────────────────────────────────────────────────────

const SETTINGS_CACHE_TTL = 300; // 5 minutes
const ROOM_CACHE_TTL = 60; // 1 minute

// ─── Hotel Settings Caching ────────────────────────────────────────────────────

/**
 * Get hotel settings with Redis caching
 * Cache TTL: 5 minutes
 */
export async function getHotelSettingsCached(propertyId: string) {
    const redis = getRedisClient();
    const cacheKey = `hotel_settings:${propertyId}`;

    // Try cache first
    if (redis) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (err) {
            console.warn('[Redis] Cache read error for hotel settings:', err);
        }
    }

    // Query database - HotelSettings uses 'id' as the primary key, which equals propertyId
    const settings = await prisma.hotelSettings.findUnique({
        where: { id: propertyId },
    });

    // Cache result
    if (redis && settings) {
        try {
            await redis.setex(cacheKey, SETTINGS_CACHE_TTL, JSON.stringify(settings));
        } catch (err) {
            console.warn('[Redis] Cache write error for hotel settings:', err);
        }
    }

    return settings;
}

/**
 * Invalidate hotel settings cache (call after updating settings)
 */
export async function invalidateHotelSettingsCache(propertyId: string) {
    const redis = getRedisClient();
    if (redis) {
        try {
            await redis.del(`hotel_settings:${propertyId}`);
        } catch (err) {
            console.warn('[Redis] Cache delete error for hotel settings:', err);
        }
    }
}

// ─── Room Availability Caching ─────────────────────────────────────────────────

/**
 * Get available rooms with Redis caching
 * Cache TTL: 1 minute
 */
export async function getAvailableRoomsCached(
    propertyId: string,
    checkIn: Date,
    checkOut: Date
) {
    const redis = getRedisClient();
    const cacheKey = `available_rooms:${propertyId}:${checkIn.toISOString()}:${checkOut.toISOString()}`;

    // Try cache first
    if (redis) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (err) {
            console.warn('[Redis] Cache read error for available rooms:', err);
        }
    }

    // Query database
    const available = await prisma.room.findMany({
        where: {
            propertyId,
            status: 'VACANT',
            cleaningStatus: 'CLEAN',
            NOT: {
                bookings: {
                    some: {
                        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                        checkIn: { lt: checkOut },
                        checkOut: { gt: checkIn },
                    },
                },
            },
        },
        include: {
            photos: { orderBy: { sortOrder: 'asc' } },
            amenities: { include: { amenity: true } },
        },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    // Cache result
    if (redis) {
        try {
            await redis.setex(cacheKey, ROOM_CACHE_TTL, JSON.stringify(available));
        } catch (err) {
            console.warn('[Redis] Cache write error for available rooms:', err);
        }
    }

    return available;
}

/**
 * Invalidate room availability cache for a property
 * Call this when bookings are created/updated/cancelled
 */
export async function invalidateRoomAvailabilityCache(propertyId: string) {
    const redis = getRedisClient();
    if (redis) {
        try {
            // Delete all room availability keys for this property
            const keys = await redis.keys(`available_rooms:${propertyId}:*`);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } catch (err) {
            console.warn('[Redis] Cache delete error for room availability:', err);
        }
    }
}

// ─── Room Type Availability Caching ────────────────────────────────────────────

/**
 * Get available rooms for a specific room type with caching
 * Cache TTL: 1 minute
 */
export async function getAvailableRoomsForTypeCached(
    propertyId: string,
    roomType: 'STUDIO' | 'PREMIUM',
    checkIn: Date,
    checkOut: Date
) {
    const redis = getRedisClient();
    const cacheKey = `available_rooms:${propertyId}:${roomType}:${checkIn.toISOString()}:${checkOut.toISOString()}`;

    // Try cache first
    if (redis) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (err) {
            console.warn('[Redis] Cache read error for room type availability:', err);
        }
    }

    // Query database
    const available = await prisma.room.findMany({
        where: {
            propertyId,
            type: roomType,
            status: 'VACANT',
            cleaningStatus: 'CLEAN',
            bookings: {
                none: {
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                    AND: [
                        { checkIn: { lt: checkOut } },
                        { checkOut: { gt: checkIn } },
                    ],
                },
            },
        },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    // Cache result
    if (redis) {
        try {
            await redis.setex(cacheKey, ROOM_CACHE_TTL, JSON.stringify(available));
        } catch (err) {
            console.warn('[Redis] Cache write error for room type availability:', err);
        }
    }

    return available;
}
