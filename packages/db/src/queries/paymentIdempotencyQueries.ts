import prisma from '../index';
import { IdempotencyStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * ─── Payment Idempotency Queries ─────────────────────────────────────────────
 *
 * Functions for managing payment idempotency to prevent duplicate charges.
 * Uses idempotency keys to track payment attempts and prevent duplicates.
 */

// ─── Create/Update ────────────────────────────────────────────────────────────

/**
 * Create an idempotency record before payment attempt
 * Returns existing record if key already exists
 */
export async function createIdempotencyRecord(
    idempotencyKey: string,
    bookingId: string,
    expectedAmount: Decimal | number,
    paymentMethod: PaymentMethod,
    ttlHours: number = 24
) {
    // Check if already exists
    const existing = await prisma.paymentIdempotency.findUnique({
        where: { idempotencyKey },
    });

    if (existing) {
        return { record: existing, isNew: false };
    }

    // Create new record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const record = await prisma.paymentIdempotency.create({
        data: {
            idempotencyKey,
            bookingId,
            expectedAmount: new Decimal(expectedAmount.toString()),
            paymentMethod,
            expiresAt,
            status: 'PENDING',
        },
    });

    return { record, isNew: true };
}

/**
 * Mark idempotency record as processed (payment successful)
 */
export async function markIdempotencyProcessed(
    idempotencyKey: string,
    paymentId: string
) {
    return prisma.paymentIdempotency.update({
        where: { idempotencyKey },
        data: {
            paymentId,
            status: 'PROCESSED',
            processedAt: new Date(),
        },
    });
}

/**
 * Mark idempotency record as failed
 */
export async function markIdempotencyFailed(
    idempotencyKey: string,
    errorMessage: string
) {
    return prisma.paymentIdempotency.update({
        where: { idempotencyKey },
        data: {
            status: 'FAILED',
            errorMessage,
            processedAt: new Date(),
        },
    });
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Get idempotency record by key
 */
export async function getIdempotencyRecord(idempotencyKey: string) {
    return prisma.paymentIdempotency.findUnique({
        where: { idempotencyKey },
    });
}

/**
 * Check if an idempotency key is valid (exists and not expired)
 */
export async function isIdempotencyKeyValid(
    idempotencyKey: string
): Promise<{ valid: boolean; record?: any; reason?: string }> {
    const record = await prisma.paymentIdempotency.findUnique({
        where: { idempotencyKey },
    });

    if (!record) {
        return { valid: true }; // New key, valid
    }

    if (record.status === 'PROCESSED') {
        return {
            valid: false,
            record,
            reason: 'Payment already processed',
        };
    }

    if (record.status === 'FAILED') {
        return {
            valid: false,
            record,
            reason: 'Previous attempt failed - can retry',
        };
    }

    if (record.status === 'EXPIRED' || record.expiresAt < new Date()) {
        return {
            valid: false,
            record,
            reason: 'Idempotency key expired',
        };
    }

    return { valid: true, record };
}

/**
 * Get pending idempotency records for cleanup
 */
export async function getExpiredIdempotencyRecords() {
    return prisma.paymentIdempotency.findMany({
        where: {
            status: 'PENDING',
            expiresAt: { lt: new Date() },
        },
    });
}

/**
 * Mark expired records
 */
export async function markExpiredIdempotencyRecords() {
    return prisma.paymentIdempotency.updateMany({
        where: {
            status: 'PENDING',
            expiresAt: { lt: new Date() },
        },
        data: {
            status: 'EXPIRED',
        },
    });
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Delete old processed/failed records (cleanup)
 * Keeps records for 7 days after processing
 */
export async function cleanupOldIdempotencyRecords(daysOld: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return prisma.paymentIdempotency.deleteMany({
        where: {
            status: { in: ['PROCESSED', 'FAILED', 'EXPIRED'] },
            processedAt: { lt: cutoffDate },
        },
    });
}
