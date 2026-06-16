import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * ─── Fraud Detection Queries ─────────────────────────────────────────────────
 *
 * Functions for detecting and managing fraudulent bookings.
 * Scenario 71: Fraudulent booking detection
 */

// ─── Create ────────────────────────────────────────────────────────────────────

/**
 * Flag a booking for fraud review
 */
export async function flagBookingForReview(
    bookingId: string,
    reason: string,
    riskScore: number,
    riskFactors: Array<{ factor: string; score: number; description: string }>,
    propertyId: string = 'default',
    createdById?: string
) {
    return prisma.fraudFlag.create({
        data: {
            bookingId,
            reason,
            riskScore,
            riskFactors: riskFactors as any,
            propertyId,
            createdById,
        },
        include: {
            booking: {
                include: {
                    guest: {
                        include: {
                            blacklistEntry: true,
                        },
                    },
                    room: { select: { roomNumber: true, type: true } },
                    payments: true,
                },
            },
        },
    });
}

// ─── Read ─────────────────────────────────────────────────────────────────────────

/**
 * Get fraud flags with filters
 */
export async function getFraudFlags(options: {
    propertyId?: string;
    status?: string;
    page?: number;
    perPage?: number;
} = {}) {
    const { propertyId, status, page = 1, perPage = 20 } = options;

    const where: Prisma.FraudFlagWhereInput = {};
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status as any;

    const [flags, total] = await Promise.all([
        prisma.fraudFlag.findMany({
            where,
            include: {
                booking: {
                    include: {
                        guest: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                email: true,
                                isBlacklisted: true,
                                blacklistEntry: true,
                            },
                        },
                        room: { select: { roomNumber: true, type: true } },
                        payments: true,
                    },
                },
            },
            orderBy: [{ riskScore: 'desc' }, { flaggedAt: 'desc' }],
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.fraudFlag.count({ where }),
    ]);

    return { flags, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Update fraud flag status
 */
export async function updateFraudFlagStatus(
    flagId: string,
    status: string,
    notes?: string
) {
    return prisma.fraudFlag.update({
        where: { id: flagId },
        data: {
            status: status as any,
            investigationNotes: notes,
        },
        include: {
            booking: {
                include: {
                    guest: { select: { id: true, name: true, phone: true } },
                    room: { select: { roomNumber: true } },
                },
            },
        },
    });
}

/**
 * Dismiss a fraud flag as false positive
 */
export async function dismissFraudFlag(flagId: string, reason: string) {
    return prisma.fraudFlag.update({
        where: { id: flagId },
        data: {
            status: 'FALSE_POSITIVE',
            dismissedReason: reason,
            resolvedAt: new Date(),
        },
        include: {
            booking: {
                include: {
                    guest: { select: { id: true, name: true } },
                },
            },
        },
    });
}

/**
 * Confirm fraud and take action
 */
export async function confirmFraud(flagId: string, actionTaken: string) {
    const flag = await prisma.fraudFlag.update({
        where: { id: flagId },
        data: {
            status: 'ACTION_TAKEN',
            actionTaken,
            resolvedAt: new Date(),
        },
        include: {
            booking: {
                include: {
                    guest: true,
                },
            },
        },
    });

    // Blacklist the guest if fraud is confirmed
    if (flag.booking && flag.booking.guestId) {
        await prisma.guestBlacklist.upsert({
            where: { guestId: flag.booking.guestId },
            update: {
                reason: 'FRAUD',
                description: `Fraud confirmed: ${actionTaken}`,
            },
            create: {
                guestId: flag.booking.guestId,
                reason: 'FRAUD',
                description: `Fraud confirmed: ${actionTaken}`,
            },
        });

        // Update guest's isBlacklisted flag
        await prisma.guest.update({
            where: { id: flag.booking.guestId },
            data: {
                isBlacklisted: true,
                blacklistReason: 'FRAUD',
            },
        });
    }

    return flag;
}

// ─── Risk Score Calculation ────────────────────────────────────────────────────

/**
 * Calculate fraud risk score for a booking
 */
export async function getFraudRiskScore(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: {
                include: {
                    blacklistEntry: true,
                    bookings: {
                        select: {
                            id: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                },
            },
            payments: true,
            createdBy: {
                select: { id: true, role: true },
            },
        },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    const riskFactors: Array<{ factor: string; score: number; description: string }> = [];
    let totalScore = 0;

    // ─── Booking Pattern Analysis ─────────────────────────────────────────────
    const checkInDate = new Date(booking.checkIn);
    const createdAt = new Date(booking.createdAt);
    const hoursUntilCheckIn = (checkInDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Last-minute booking (within 24 hours)
    if (hoursUntilCheckIn < 24) {
        const score = 25;
        riskFactors.push({
            factor: 'LAST_MINUTE_BOOKING',
            score,
            description: `Booking created ${Math.round(hoursUntilCheckIn)} hours before check-in`,
        });
        totalScore += score;
    }

    // ─── Guest History Analysis ───────────────────────────────────────────────
    const guest = booking.guest;
    const previousBookings = guest.bookings || [];
    const previousBookingCount = previousBookings.length;

    // First-time guest
    if (previousBookingCount === 0) {
        const score = 15;
        riskFactors.push({
            factor: 'FIRST_TIME_GUEST',
            score,
            description: 'No previous booking history',
        });
        totalScore += score;
    }

    // Blacklisted guest
    if (guest.isBlacklisted || guest.blacklistEntry) {
        const score = 50;
        riskFactors.push({
            factor: 'BLACKLISTED_GUEST',
            score,
            description: guest.blacklistReason || 'Guest is on blacklist',
        });
        totalScore += score;
    }

    // ─── Payment Anomaly Analysis ─────────────────────────────────────────────
    const payments = booking.payments || [];
    const totalPaymentAmount = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
    );
    const bookingTotal = Number(booking.totalAmount);

    // High-value booking
    if (bookingTotal > 10000) {
        const score = 20;
        riskFactors.push({
            factor: 'HIGH_VALUE_BOOKING',
            score,
            description: `Booking total of ₹${bookingTotal} exceeds ₹10,000`,
        });
        totalScore += score;
    }

    // Unpaid or pending payment
    if (booking.paymentStatus === 'PENDING' && bookingTotal > 5000) {
        const score = 15;
        riskFactors.push({
            factor: 'UNPAID_HIGH_VALUE',
            score,
            description: `High-value booking with pending payment`,
        });
        totalScore += score;
    }

    // Multiple payment attempts
    if (payments.length > 2) {
        const score = 10;
        riskFactors.push({
            factor: 'MULTIPLE_PAYMENT_ATTEMPTS',
            score,
            description: `${payments.length} payment attempts recorded`,
        });
        totalScore += score;
    }

    // ─── Contact Info Anomaly ─────────────────────────────────────────────────
    // Check for invalid phone format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (guest.phone && !phoneRegex.test(guest.phone.replace(/\D/g, ''))) {
        const score = 20;
        riskFactors.push({
            factor: 'INVALID_PHONE',
            score,
            description: 'Phone number format appears invalid',
        });
        totalScore += score;
    }

    // Check for suspicious email
    if (guest.email) {
        const emailDomain = guest.email.split('@')[1]?.toLowerCase();
        const suspiciousDomains = ['tempmail.com', 'throwaway.com', 'fakeinbox.com', 'mailinator.com'];
        if (emailDomain && suspiciousDomains.some(d => emailDomain.includes(d))) {
            const score = 25;
            riskFactors.push({
                factor: 'DISPOSABLE_EMAIL',
                score,
                description: `Email from potentially disposable domain: ${emailDomain}`,
            });
            totalScore += score;
        }
    }

    // ─── Booking Source Analysis ─────────────────────────────────────────────
    if (booking.bookingSource === 'OTA') {
        const score = 5;
        riskFactors.push({
            factor: 'OTA_BOOKING',
            score,
            description: 'Booking through OTA - requires additional verification',
        });
        totalScore += score;
    }

    // Cap score at 100
    totalScore = Math.min(totalScore, 100);

    return {
        bookingId,
        riskScore: totalScore,
        riskLevel: totalScore >= 70 ? 'HIGH' : totalScore >= 40 ? 'MEDIUM' : 'LOW',
        riskFactors,
        recommendation: totalScore >= 70 ? 'REVIEW_REQUIRED' : totalScore >= 40 ? 'MONITOR' : 'APPROVE',
    };
}
