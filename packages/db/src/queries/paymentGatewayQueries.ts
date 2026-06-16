// packages/db/src/queries/paymentGatewayQueries.ts
// Payment Gateway Reconciliation Queries

import prisma from '../index';

// ── Types ─────────────────────────────────────────────────────────────────────

export type GatewayTransaction = {
    gatewayRef: string;
    amount: number;
    status: string;
    transactionDate: Date;
    bookingId?: string;
    guestName?: string;
};

export type ReconciliationResult = {
    gatewayTransactions: GatewayTransaction[];
    localPayments: any[];
    matched: number;
    discrepancies: Discrepancy[];
    unreconciled: UnreconciledItem[];
};

export type Discrepancy = {
    id: string;
    type: DiscrepancyType;
    gatewayRef?: string;
    localRef?: string;
    gatewayAmount?: number;
    localAmount?: number;
    description: string;
    status: 'OPEN' | 'RESOLVED' | 'INVESTIGATING';
    createdAt: Date;
};

export type UnreconciledItem = {
    source: 'GATEWAY' | 'LOCAL';
    reference: string;
    amount: number;
    date: Date;
    bookingId?: string;
};

export type DiscrepancyType =
    | 'AMOUNT_MISMATCH'
    | 'MISSING_IN_GATEWAY'
    | 'MISSING_IN_LOCAL'
    | 'STATUS_MISMATCH'
    | 'DUPLICATE_TRANSACTION';

export type ReconciliationReport = {
    gateway: string;
    periodStart: Date;
    periodEnd: Date;
    totalGatewayTransactions: number;
    totalLocalPayments: number;
    matchedCount: number;
    discrepancyCount: number;
    totalAmountGateway: number;
    totalAmountLocal: number;
    amountDifference: number;
    byStatus: Record<string, number>;
};

// ── Gateway Transactions ─────────────────────────────────────────────────────

/**
 * Get transactions from a payment gateway (simulated for now)
 * In production, this would call the actual gateway API
 */
export async function getGatewayTransactions(
    gateway: string,
    date: Date
): Promise<GatewayTransaction[]> {
    // Simulated gateway transactions
    // In production, this would call INDUSIND, RAZORPAY, etc. APIs
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // For simulation, return empty array - real implementation would call gateway API
    return [];
}

/**
 * Get local payments for a specific date and gateway
 */
export async function getLocalPaymentsForDate(
    gateway: string,
    date: Date,
    propertyId: string = 'default'
) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.payment.findMany({
        where: {
            createdAt: {
                gte: startOfDay,
                lte: endOfDay,
            },
            status: 'PAID',
            // Gateway-specific filtering would go here based on method
            booking: {
                propertyId,
            },
        },
        include: {
            booking: {
                include: {
                    guest: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}

// ── Reconciliation ────────────────────────────────────────────────────────────

/**
 * Reconcile gateway payments with local records
 */
export async function reconcileGatewayPayments(
    gateway: string,
    date: Date,
    propertyId: string = 'default'
): Promise<ReconciliationResult> {
    // Get gateway transactions
    const gatewayTransactions = await getGatewayTransactions(gateway, date);

    // Get local payments
    const localPayments = await getLocalPaymentsForDate(gateway, date, propertyId);

    // Match transactions
    const matched: string[] = [];
    const discrepancies: Discrepancy[] = [];
    const unreconciled: UnreconciledItem[] = [];

    // Create lookup maps
    const gatewayMap = new Map<string, GatewayTransaction>();
    const localMap = new Map<string, any>();

    gatewayTransactions.forEach((gt) => {
        if (gt.gatewayRef) {
            gatewayMap.set(gt.gatewayRef, gt);
        }
    });

    localPayments.forEach((lp) => {
        if (lp.gatewayRef) {
            localMap.set(lp.gatewayRef, lp);
        }
    });

    // Check for matches and discrepancies
    for (const [ref, gt] of gatewayMap) {
        const localPayment = localMap.get(ref);

        if (localPayment) {
            matched.push(ref);

            // Check for amount mismatch
            if (Math.abs(gt.amount - Number(localPayment.amount)) > 0.01) {
                discrepancies.push({
                    id: `DM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'AMOUNT_MISMATCH',
                    gatewayRef: ref,
                    localRef: localPayment.id,
                    gatewayAmount: gt.amount,
                    localAmount: Number(localPayment.amount),
                    description: `Amount mismatch: Gateway shows ₹${gt.amount}, Local shows ₹${localPayment.amount}`,
                    status: 'OPEN',
                    createdAt: new Date(),
                });
            }
        } else {
            // Gateway transaction not found locally
            discrepancies.push({
                id: `DM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'MISSING_IN_LOCAL',
                gatewayRef: ref,
                gatewayAmount: gt.amount,
                description: `Gateway transaction ${ref} not found in local records`,
                status: 'OPEN',
                createdAt: new Date(),
            });

            unreconciled.push({
                source: 'GATEWAY',
                reference: ref,
                amount: gt.amount,
                date: gt.transactionDate,
                bookingId: gt.bookingId,
            });
        }
    }

    // Check for local payments not in gateway
    for (const [ref, lp] of localMap) {
        if (!gatewayMap.has(ref)) {
            discrepancies.push({
                id: `DM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'MISSING_IN_GATEWAY',
                localRef: lp.id,
                gatewayRef: ref,
                localAmount: Number(lp.amount),
                description: `Local payment ${lp.id} not found in gateway records`,
                status: 'OPEN',
                createdAt: new Date(),
            });

            unreconciled.push({
                source: 'LOCAL',
                reference: lp.id,
                amount: Number(lp.amount),
                date: lp.createdAt,
                bookingId: lp.bookingId,
            });
        }
    }

    return {
        gatewayTransactions,
        localPayments,
        matched: matched.length,
        discrepancies,
        unreconciled,
    };
}

/**
 * Get reconciliation report for a period
 */
export async function getReconciliationReport(
    gateway: string,
    startDate: Date,
    endDate: Date
): Promise<ReconciliationReport> {
    // Get all payments in the period
    const payments = await prisma.payment.findMany({
        where: {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
            status: 'PAID',
        },
        include: {
            booking: {
                select: {
                    propertyId: true,
                },
            },
        },
    });

    // Get gateway transactions
    const gatewayTransactions: GatewayTransaction[] = [];

    // Calculate totals
    const totalLocalPayments = payments.length;
    const totalAmountLocal = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
    );

    // Get discrepancy count
    const discrepancies = await prisma.auditDiscrepancy.findMany({
        where: {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
            type: 'PAYMENT_MISMATCH',
        },
    });

    // Count by status
    const byStatus: Record<string, number> = {};
    discrepancies.forEach((d) => {
        const status = d.resolved ? 'RESOLVED' : 'OPEN';
        byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return {
        gateway,
        periodStart: startDate,
        periodEnd: endDate,
        totalGatewayTransactions: gatewayTransactions.length,
        totalLocalPayments,
        matchedCount: totalLocalPayments, // Simplified - would be calculated from actual matching
        discrepancyCount: discrepancies.length,
        totalAmountGateway: gatewayTransactions.reduce((sum, t) => sum + t.amount, 0),
        totalAmountLocal,
        amountDifference:
            gatewayTransactions.reduce((sum, t) => sum + t.amount, 0) - totalAmountLocal,
        byStatus,
    };
}

// ── Discrepancy Management ────────────────────────────────────────────────────

/**
 * Get payment discrepancies
 */
export async function getPaymentDiscrepancies(
    gateway?: string,
    startDate?: Date,
    endDate?: Date,
    status?: 'OPEN' | 'RESOLVED' | 'INVESTIGATING'
) {
    const where: any = {
        type: 'PAYMENT_MISMATCH',
    };

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const discrepancies = await prisma.auditDiscrepancy.findMany({
        where,
        include: {
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    guest: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Filter by status if provided
    let filtered = discrepancies;
    if (status) {
        filtered = discrepancies.filter((d) =>
            status === 'OPEN'
                ? !d.resolved
                : status === 'RESOLVED'
                    ? d.resolved
                    : true
        );
    }

    return filtered;
}

/**
 * Mark a payment discrepancy as resolved
 */
export async function markPaymentDiscrepancy(
    discrepancyId: string,
    resolution: string,
    resolvedById?: string
) {
    return prisma.auditDiscrepancy.update({
        where: { id: discrepancyId },
        data: {
            resolved: true,
            resolvedAt: new Date(),
            resolvedById,
            resolutionNotes: resolution,
        },
    });
}

/**
 * Get a specific discrepancy by ID
 */
export async function getDiscrepancyById(discrepancyId: string) {
    return prisma.auditDiscrepancy.findUnique({
        where: { id: discrepancyId },
        include: {
            booking: {
                include: {
                    guest: {
                        select: {
                            name: true,
                            phone: true,
                        },
                    },
                },
            },
        },
    });
}