import prisma from '../index';
import { EscalationLevel } from '@prisma/client';

/**
 * ─── Complaint Escalation Queries ───────────────────────────────────────────
 *
 * Functions for managing complaint escalation levels
 */

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Escalate a complaint
 */
export async function escalateComplaint(
    complaintId: string,
    level: EscalationLevel,
    escalatedTo: string,
    reason?: string
) {
    return prisma.complaintEscalation.create({
        data: {
            complaintId,
            level,
            escalatedTo,
            reason,
        },
        include: {
            complaint: {
                select: {
                    id: true,
                    subject: true,
                    status: true,
                    booking: {
                        select: {
                            id: true,
                            bookingNumber: true,
                            guest: { select: { name: true } },
                        },
                    },
                },
            },
        },
    });
}

/**
 * Resolve an escalation
 */
export async function resolveEscalation(
    escalationId: string,
    resolution: string,
    resolvedById: string
) {
    return prisma.complaintEscalation.update({
        where: { id: escalationId },
        data: {
            resolution,
            resolvedById,
            resolvedAt: new Date(),
        },
    });
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Get escalations for a complaint
 */
export async function getComplaintEscalations(complaintId: string) {
    return prisma.complaintEscalation.findMany({
        where: { complaintId },
        orderBy: { escalatedAt: 'desc' },
    });
}

/**
 * Get pending escalations (not resolved)
 */
export async function getPendingEscalations(options: {
    level?: EscalationLevel;
    page?: number;
    perPage?: number;
} = {}) {
    const { level, page = 1, perPage = 20 } = options;

    const where: any = {
        resolvedAt: null,
    };
    if (level) where.level = level;

    const [escalations, total] = await Promise.all([
        prisma.complaintEscalation.findMany({
            where,
            include: {
                complaint: {
                    select: {
                        id: true,
                        subject: true,
                        status: true,
                        isUrgent: true,
                        booking: {
                            select: {
                                id: true,
                                bookingNumber: true,
                                guest: { select: { name: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { escalatedAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.complaintEscalation.count({ where }),
    ]);

    return { escalations, total, pages: Math.ceil(total / perPage), page };
}

/**
 * Get escalation statistics
 */
export async function getEscalationStats() {
    const [total, pending, resolved, byLevel] = await Promise.all([
        prisma.complaintEscalation.count(),
        prisma.complaintEscalation.count({ where: { resolvedAt: null } }),
        prisma.complaintEscalation.count({ where: { resolvedAt: { not: null } } }),
        prisma.complaintEscalation.groupBy({
            by: ['level'],
            _count: true,
        }),
    ]);

    return {
        total,
        pending,
        resolved,
        byLevel: byLevel.map(l => ({ level: l.level, count: l._count })),
    };
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update escalation level
 */
export async function updateEscalationLevel(
    escalationId: string,
    level: EscalationLevel
) {
    return prisma.complaintEscalation.update({
        where: { id: escalationId },
        data: { level },
    });
}
