import prisma from '../index';

/**
 * ─── Guest Blacklist Queries ─────────────────────────────────────────────────
 *
 * Functions for managing guest blacklist entries.
 * Blacklisted guests cannot make new bookings.
 */

// ─── Create ────────────────────────────────────────────────────────────────────

/**
 * Add a guest to the blacklist
 */
export async function addToBlacklist(
    guestId: string,
    reason: string,
    description: string | null,
    createdById: string | null,
    expiresAt: Date | null
) {
    return prisma.guestBlacklist.create({
        data: {
            guestId,
            reason,
            description,
            createdById,
            expiresAt,
        },
        include: {
            guest: { select: { id: true, name: true, phone: true } },
            createdBy: { select: { id: true, name: true } },
        },
    });
}

/**
 * Remove a guest from the blacklist
 */
export async function removeFromBlacklist(guestId: string) {
    return prisma.guestBlacklist.delete({
        where: { guestId },
    });
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Get blacklist entry for a guest
 */
export async function getBlacklistEntry(guestId: string) {
    return prisma.guestBlacklist.findUnique({
        where: { guestId },
        include: {
            guest: { select: { id: true, name: true, phone: true, email: true } },
            createdBy: { select: { id: true, name: true } },
        },
    });
}

/**
 * Check if a guest is blacklisted (and not expired)
 */
export async function isGuestBlacklisted(guestId: string): Promise<boolean> {
    const entry = await prisma.guestBlacklist.findUnique({
        where: { guestId },
        select: { expiresAt: true },
    });

    if (!entry) return false;

    // If expiresAt is null, it's permanent
    if (!entry.expiresAt) return true;

    // Check if expired
    return entry.expiresAt > new Date();
}

/**
 * Get all blacklist entries with optional filters
 */
export async function getBlacklistEntries(options: {
    includeExpired?: boolean;
    page?: number;
    perPage?: number;
} = {}) {
    const { includeExpired = false, page = 1, perPage = 20 } = options;

    const where = includeExpired ? {} : {
        OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
        ],
    };

    const [entries, total] = await Promise.all([
        prisma.guestBlacklist.findMany({
            where,
            include: {
                guest: { select: { id: true, name: true, phone: true, email: true } },
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.guestBlacklist.count({ where }),
    ]);

    return { entries, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Search blacklist by guest name or phone
 */
export async function searchBlacklist(query: string) {
    return prisma.guestBlacklist.findMany({
        where: {
            guest: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } },
                ],
            },
        },
        include: {
            guest: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update blacklist entry (e.g., extend expiration)
 */
export async function updateBlacklistEntry(
    guestId: string,
    data: {
        reason?: string;
        description?: string | null;
        expiresAt?: Date | null;
    }
) {
    return prisma.guestBlacklist.update({
        where: { guestId },
        data,
        include: {
            guest: { select: { id: true, name: true, phone: true } },
        },
    });
}

/**
 * Sync the quick-flag on Guest with actual blacklist status
 */
export async function syncGuestBlacklistFlag(guestId: string) {
    const isBlacklisted = await isGuestBlacklisted(guestId);

    return prisma.guest.update({
        where: { id: guestId },
        data: {
            isBlacklisted,
            blacklistReason: isBlacklisted ? undefined : null,
        },
    });
}
