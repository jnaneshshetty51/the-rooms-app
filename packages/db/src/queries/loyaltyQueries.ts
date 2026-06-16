// packages/db/src/queries/loyaltyQueries.ts
// Loyalty points tracking - Scenario 79

import prisma from '../index';
import { LoyaltyTier, LoyaltyTransactionType } from '@prisma/client';

// Points earning rate: 1 point per ₹100 spent (configurable)
const POINTS_PER_RUPEE = 100;

// Tier thresholds
const TIER_THRESHOLDS = {
    BRONZE: 0,
    SILVER: 1000,
    GOLD: 5000,
    PLATINUM: 10000,
};

// Tier benefits
const TIER_BENEFITS = {
    BRONZE: {
        discountPercent: 0,
        freeUpgradeAfter: 5,
        priorityCheckIn: false,
        lateCheckOut: false,
        welcomeDrink: false,
    },
    SILVER: {
        discountPercent: 5,
        freeUpgradeAfter: 3,
        priorityCheckIn: true,
        lateCheckOut: false,
        welcomeDrink: true,
    },
    GOLD: {
        discountPercent: 10,
        freeUpgradeAfter: 2,
        priorityCheckIn: true,
        lateCheckOut: true,
        welcomeDrink: true,
    },
    PLATINUM: {
        discountPercent: 15,
        freeUpgradeAfter: 1,
        priorityCheckIn: true,
        lateCheckOut: true,
        welcomeDrink: true,
    },
};

/**
 * Get guest loyalty points summary
 */
export async function getGuestLoyaltyPoints(guestId: string) {
    let loyaltyPoints = await prisma.loyaltyPoint.findUnique({
        where: { guestId },
    });

    // Create loyalty points record if it doesn't exist
    if (!loyaltyPoints) {
        loyaltyPoints = await prisma.loyaltyPoint.create({
            data: {
                guestId,
                currentBalance: 0,
                lifetimeEarned: 0,
                lifetimeRedeemed: 0,
                currentTier: 'BRONZE',
            },
        });
    }

    // Calculate points to next tier
    const currentTier = loyaltyPoints.currentTier;
    let pointsToNextTier: number | null = null;

    if (currentTier === 'BRONZE') {
        pointsToNextTier = TIER_THRESHOLDS.SILVER - loyaltyPoints.lifetimeEarned;
    } else if (currentTier === 'SILVER') {
        pointsToNextTier = TIER_THRESHOLDS.GOLD - loyaltyPoints.lifetimeEarned;
    } else if (currentTier === 'GOLD') {
        pointsToNextTier = TIER_THRESHOLDS.PLATINUM - loyaltyPoints.lifetimeEarned;
    } else {
        pointsToNextTier = null; // Already at highest tier
    }

    return {
        ...loyaltyPoints,
        pointsToNextTier,
        benefits: TIER_BENEFITS[loyaltyPoints.currentTier],
    };
}

/**
 * Credit points to a guest
 */
export async function creditPoints(
    guestId: string,
    points: number,
    type: LoyaltyTransactionType,
    bookingId?: string,
    description?: string
) {
    const loyaltyPoints = await getGuestLoyaltyPoints(guestId);
    const newBalance = loyaltyPoints.currentBalance + points;
    const newLifetimeEarned = loyaltyPoints.lifetimeEarned + points;

    // Update or create loyalty points record
    const updatedPoints = await prisma.loyaltyPoint.upsert({
        where: { guestId },
        create: {
            guestId,
            currentBalance: points,
            lifetimeEarned: points,
            lifetimeRedeemed: 0,
            currentTier: determineTier(newLifetimeEarned),
        },
        update: {
            currentBalance: newBalance,
            lifetimeEarned: newLifetimeEarned,
            currentTier: determineTier(newLifetimeEarned),
            tierUpdatedAt: determineTier(newLifetimeEarned) !== loyaltyPoints.currentTier ? new Date() : undefined,
        },
    });

    // Create transaction record
    await prisma.loyaltyTransaction.create({
        data: {
            guestId,
            type,
            points,
            bookingId,
            description: description || `Credited ${points} points`,
            balanceAfter: newBalance,
        },
    });

    return updatedPoints;
}

/**
 * Debit points from a guest
 */
export async function debitPoints(
    guestId: string,
    points: number,
    type: LoyaltyTransactionType,
    bookingId?: string,
    description?: string
) {
    const loyaltyPoints = await getGuestLoyaltyPoints(guestId);

    if (loyaltyPoints.currentBalance < points) {
        throw new Error('Insufficient points balance');
    }

    const newBalance = loyaltyPoints.currentBalance - points;
    const newLifetimeRedeemed = loyaltyPoints.lifetimeRedeemed + points;

    // Update loyalty points
    const updatedPoints = await prisma.loyaltyPoint.update({
        where: { guestId },
        data: {
            currentBalance: newBalance,
            lifetimeRedeemed: newLifetimeRedeemed,
        },
    });

    // Create transaction record
    await prisma.loyaltyTransaction.create({
        data: {
            guestId,
            type,
            points: -points,
            bookingId,
            description: description || `Debited ${points} points`,
            balanceAfter: newBalance,
        },
    });

    return updatedPoints;
}

/**
 * Redeem points for a reward
 */
export async function redeemPoints(
    guestId: string,
    points: number,
    rewardType: 'DISCOUNT' | 'FREE_NIGHT' | 'UPGRADE' | 'VOUCHER',
    bookingId?: string
) {
    const loyaltyPoints = await getGuestLoyaltyPoints(guestId);

    if (loyaltyPoints.currentBalance < points) {
        throw new Error('Insufficient points balance');
    }

    // Check if guest qualifies for the reward based on tier
    const benefits = TIER_BENEFITS[loyaltyPoints.currentTier];

    if (rewardType === 'UPGRADE' && !benefits.priorityCheckIn) {
        throw new Error('Upgrade not available for your tier');
    }

    return debitPoints(guestId, points, 'REDEEMED', bookingId, `Redeemed for ${rewardType}`);
}

/**
 * Calculate points to earn for a booking
 */
export async function calculatePointsToEarn(bookingId: string): Promise<number> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    // Calculate base points from total amount
    const totalAmount = Number(booking.totalAmount);
    const basePoints = Math.floor(totalAmount / POINTS_PER_RUPEE);

    // Apply tier multiplier
    const loyaltyPoints = await getGuestLoyaltyPoints(booking.guestId);
    let tierMultiplier = 1;

    if (loyaltyPoints.currentTier === 'SILVER') {
        tierMultiplier = 1.25;
    } else if (loyaltyPoints.currentTier === 'GOLD') {
        tierMultiplier = 1.5;
    } else if (loyaltyPoints.currentTier === 'PLATINUM') {
        tierMultiplier = 2;
    }

    return Math.floor(basePoints * tierMultiplier);
}

/**
 * Get points transaction history
 */
export async function getPointsHistory(guestId: string, limit: number = 50) {
    return prisma.loyaltyTransaction.findMany({
        where: { guestId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}

/**
 * Check and expire old points
 */
export async function checkPointsExpiry(guestId: string) {
    const loyaltyPoints = await getGuestLoyaltyPoints(guestId);

    // Points expire after 24 months of inactivity
    const lastTransaction = await prisma.loyaltyTransaction.findFirst({
        where: { guestId },
        orderBy: { createdAt: 'desc' },
    });

    if (!lastTransaction) {
        return { expired: false, pointsExpired: 0 };
    }

    const monthsSinceLastTransaction = Math.floor(
        (Date.now() - lastTransaction.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    if (monthsSinceLastTransaction >= 24) {
        // Expire all points
        const pointsToExpire = loyaltyPoints.currentBalance;

        if (pointsToExpire > 0) {
            await prisma.loyaltyPoint.update({
                where: { guestId },
                data: {
                    currentBalance: 0,
                },
            });

            await prisma.loyaltyTransaction.create({
                data: {
                    guestId,
                    type: 'EXPIRED',
                    points: -pointsToExpire,
                    description: `Expired ${pointsToExpire} points due to inactivity`,
                    balanceAfter: 0,
                    expiresAt: new Date(),
                    expiredAt: new Date(),
                },
            });
        }

        return { expired: true, pointsExpired: pointsToExpire };
    }

    return { expired: false, pointsExpired: 0 };
}

/**
 * Upgrade loyalty tier based on lifetime points
 */
export async function upgradeLoyaltyTier(guestId: string) {
    const loyaltyPoints = await getGuestLoyaltyPoints(guestId);
    const newTier = determineTier(loyaltyPoints.lifetimeEarned);

    if (newTier !== loyaltyPoints.currentTier) {
        return prisma.loyaltyPoint.update({
            where: { guestId },
            data: {
                currentTier: newTier,
                tierUpdatedAt: new Date(),
            },
        });
    }

    return loyaltyPoints;
}

/**
 * Get benefits for a tier
 */
export async function getLoyaltyTierBenefits(tier: LoyaltyTier) {
    return TIER_BENEFITS[tier];
}

/**
 * Determine tier based on lifetime points
 */
function determineTier(lifetimePoints: number): LoyaltyTier {
    if (lifetimePoints >= TIER_THRESHOLDS.PLATINUM) {
        return 'PLATINUM';
    } else if (lifetimePoints >= TIER_THRESHOLDS.GOLD) {
        return 'GOLD';
    } else if (lifetimePoints >= TIER_THRESHOLDS.SILVER) {
        return 'SILVER';
    }
    return 'BRONZE';
}

/**
 * Award points for completed booking
 */
export async function awardBookingPoints(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    // Only award for completed bookings
    if (booking.status !== 'CHECKED_OUT') {
        return null;
    }

    const pointsToEarn = await calculatePointsToEarn(bookingId);

    if (pointsToEarn > 0) {
        return creditPoints(
            booking.guestId,
            pointsToEarn,
            'EARNED',
            bookingId,
            `Earned ${pointsToEarn} points from booking ${booking.bookingNumber}`
        );
    }

    return null;
}

/**
 * Get loyalty leaderboard for a property
 */
export async function getLoyaltyLeaderboard(propertyId?: string, limit: number = 10) {
    const guests = await prisma.loyaltyPoint.findMany({
        orderBy: { lifetimeEarned: 'desc' },
        take: limit,
        include: {
            guest: {
                include: {
                    bookings: {
                        where: propertyId ? { propertyId } : undefined,
                        select: {
                            id: true,
                            status: true,
                        },
                    },
                },
            },
        },
    });

    return guests.map((lp, index) => ({
        rank: index + 1,
        guestId: lp.guestId,
        guestName: lp.guest.name,
        tier: lp.currentTier,
        lifetimePoints: lp.lifetimeEarned,
        currentBalance: lp.currentBalance,
        totalStays: lp.guest.bookings.length,
    }));
}
