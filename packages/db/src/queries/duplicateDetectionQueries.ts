import prisma from '../index';
import { Prisma, DuplicateMatchType, DuplicateStatus, RoomType } from '@prisma/client';

export interface DuplicateCheckParams {
    guestId?: string;
    guestPhone?: string;
    guestEmail?: string;
    guestName?: string;
    checkIn: Date;
    checkOut: Date;
    roomType?: RoomType;
    excludeBookingId?: string;
    propertyId?: string;
}

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    matchType: DuplicateMatchType | null;
    confidence: number;
    existingBookings: {
        bookingId: string;
        bookingNumber: string;
        checkIn: Date;
        checkOut: Date;
        room: { roomNumber: string; type: RoomType };
        guest: { name: string; phone: string; email?: string };
    }[];
}

/**
 * Check for duplicate bookings
 */
export async function checkForDuplicates(params: DuplicateCheckParams): Promise<DuplicateCheckResult> {
    const matches: DuplicateCheckResult['existingBookings'] = [];
    let matchType: DuplicateMatchType | null = null;
    let confidence = 0;

    // Build date overlap condition
    const dateOverlapCondition = {
        OR: [
            // New check-in during existing booking
            {
                checkIn: { lte: params.checkIn },
                checkOut: { gt: params.checkIn }
            },
            // New check-out during existing booking
            {
                checkIn: { lt: params.checkOut },
                checkOut: { gte: params.checkOut }
            },
            // New booking contains existing
            {
                checkIn: { gte: params.checkIn },
                checkOut: { lte: params.checkOut }
            }
        ]
    };

    // 1. Exact phone + date overlap check (highest confidence)
    if (params.guestPhone) {
        const phoneMatches = await prisma.booking.findMany({
            where: {
                guest: { phone: params.guestPhone },
                id: params.excludeBookingId ? { not: params.excludeBookingId } : undefined,
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                propertyId: params.propertyId || 'default',
                ...dateOverlapCondition,
            },
            include: {
                guest: { select: { name: true, phone: true, email: true } },
                room: { select: { roomNumber: true, type: true } }
            }
        });

        if (phoneMatches.length > 0) {
            matchType = 'EXACT_PHONE';
            confidence = 100;
            matches.push(...phoneMatches.map(b => ({
                bookingId: b.id,
                bookingNumber: b.bookingNumber,
                checkIn: b.checkIn,
                checkOut: b.checkOut,
                room: b.room,
                guest: { ...b.guest, email: b.guest.email ?? undefined }
            })));
        }
    }

    // 2. Exact email + date overlap check
    if (params.guestEmail && confidence < 100) {
        const emailMatches = await prisma.booking.findMany({
            where: {
                guest: { email: params.guestEmail },
                id: params.excludeBookingId ? { not: params.excludeBookingId } : undefined,
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                propertyId: params.propertyId || 'default',
                ...dateOverlapCondition,
            },
            include: {
                guest: { select: { name: true, phone: true, email: true } },
                room: { select: { roomNumber: true, type: true } }
            }
        });

        if (emailMatches.length > 0) {
            matchType = 'EXACT_EMAIL';
            confidence = 100;
            // Add to matches if not already there
            for (const booking of emailMatches) {
                if (!matches.some(m => m.bookingId === booking.id)) {
                    matches.push({
                        bookingId: booking.id,
                        bookingNumber: booking.bookingNumber,
                        checkIn: booking.checkIn,
                        checkOut: booking.checkOut,
                        room: booking.room,
                        guest: { ...booking.guest, email: booking.guest.email ?? undefined }
                    });
                }
            }
        }
    }

    // 3. Same room type + date overlap check (medium confidence - could be different guests)
    if (params.roomType && confidence < 100) {
        const roomMatches = await prisma.booking.findMany({
            where: {
                room: { type: params.roomType },
                id: params.excludeBookingId ? { not: params.excludeBookingId } : undefined,
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                propertyId: params.propertyId || 'default',
                ...dateOverlapCondition,
            },
            include: {
                guest: { select: { name: true, phone: true, email: true } },
                room: { select: { roomNumber: true, type: true } }
            }
        });

        if (roomMatches.length > 0) {
            matchType = 'EXACT_DATES_ROOM';
            confidence = 90;
        }
    }

    // 4. Fuzzy name matching (lower confidence - just a warning)
    if (params.guestName && confidence < 100) {
        const namePrefix = params.guestName.substring(0, 3).toLowerCase();
        const fuzzyMatches = await prisma.booking.findMany({
            where: {
                guest: {
                    name: { contains: namePrefix }
                },
                id: params.excludeBookingId ? { not: params.excludeBookingId } : undefined,
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                propertyId: params.propertyId || 'default',
                ...dateOverlapCondition,
            },
            include: {
                guest: { select: { name: true, phone: true, email: true } },
                room: { select: { roomNumber: true, type: true } }
            }
        });

        if (fuzzyMatches.length > 0) {
            matchType = 'FUZZY_NAME';
            confidence = 60;
        }
    }

    return {
        isDuplicate: confidence >= 90,
        matchType,
        confidence,
        existingBookings: matches
    };
}

/**
 * Create a duplicate booking candidate record for review
 */
export async function createDuplicateCandidate(data: {
    primaryBookingId: string;
    duplicateBookingId: string;
    matchType: DuplicateMatchType;
    matchFields: string[];
    notes?: string;
}) {
    return prisma.duplicateBookingCandidate.create({
        data: {
            primaryBookingId: data.primaryBookingId,
            duplicateBookingId: data.duplicateBookingId,
            matchType: data.matchType,
            matchFields: data.matchFields,
            notes: data.notes,
            status: 'PENDING',
        },
    });
}

/**
 * Get pending duplicate candidates for review
 */
export async function getDuplicateCandidates(filters: {
    status?: DuplicateStatus;
    propertyId?: string;
    page?: number;
    perPage?: number;
} = {}) {
    const {
        status = 'PENDING',
        propertyId,
        page = 1,
        perPage = 20,
    } = filters;

    const where: Prisma.DuplicateBookingCandidateWhereInput = {};
    if (status) where.status = status;
    if (propertyId) {
        where.OR = [
            { primaryBookingId: { equals: '' } }, // This won't match, but we need to filter
        ];
    }

    // Actually, we need to join with booking to filter by propertyId
    const [candidates, total] = await Promise.all([
        prisma.duplicateBookingCandidate.findMany({
            where: { status },
            orderBy: { detectedAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.duplicateBookingCandidate.count({ where: { status } }),
    ]);

    // Fetch associated bookings for each candidate
    const bookingIds = candidates.flatMap(c => [c.primaryBookingId, c.duplicateBookingId]);
    const bookings = await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        include: {
            guest: { select: { name: true, phone: true, email: true } },
            room: { select: { roomNumber: true, type: true } },
        },
    });

    const bookingMap = new Map(bookings.map(b => [b.id, b]));

    const enrichedCandidates = candidates.map(candidate => ({
        ...candidate,
        primaryBooking: bookingMap.get(candidate.primaryBookingId),
        duplicateBooking: bookingMap.get(candidate.duplicateBookingId),
    }));

    return { candidates: enrichedCandidates, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Resolve a duplicate booking candidate
 */
export async function resolveDuplicate(
    id: string,
    resolution: 'KEPT_PRIMARY' | 'MERGED' | 'BOTH_KEPT',
    resolvedById: string,
    notes?: string
) {
    return prisma.duplicateBookingCandidate.update({
        where: { id },
        data: {
            status: 'RESOLVED',
            resolution,
            resolvedById,
            resolvedAt: new Date(),
            notes,
        },
    });
}

/**
 * Dismiss a duplicate candidate (false positive)
 */
export async function dismissDuplicateCandidate(id: string, dismissedById: string, reason?: string) {
    return prisma.duplicateBookingCandidate.update({
        where: { id },
        data: {
            status: 'DISMISSED',
            resolvedById: dismissedById,
            resolvedAt: new Date(),
            notes: reason,
        },
    });
}

/**
 * Get a single duplicate candidate by ID
 */
export async function getDuplicateCandidateById(id: string) {
    const candidate = await prisma.duplicateBookingCandidate.findUnique({
        where: { id },
    });

    if (!candidate) return null;

    const [primaryBooking, duplicateBooking] = await Promise.all([
        prisma.booking.findUnique({
            where: { id: candidate.primaryBookingId },
            include: {
                guest: { select: { name: true, phone: true, email: true } },
                room: { select: { roomNumber: true, type: true } },
            },
        }),
        prisma.booking.findUnique({
            where: { id: candidate.duplicateBookingId },
            include: {
                guest: { select: { name: true, phone: true, email: true } },
                room: { select: { roomNumber: true, type: true } },
            },
        }),
    ]);

    return {
        ...candidate,
        primaryBooking,
        duplicateBooking,
    };
}