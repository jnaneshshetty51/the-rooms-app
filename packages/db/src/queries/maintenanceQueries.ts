import prisma from '../index';
import { Prisma, MaintenanceType, MaintenanceStatus, Priority, RoomStatus } from '@prisma/client';

/**
 * ─── Room Maintenance Queries (Scenarios 43-44) ───────────────────────────
 *
 * Functions for room maintenance management:
 * - Report maintenance issues
 * - Update maintenance status
 * - Complete maintenance
 * - Get maintenance history
 */

// ─── Report Maintenance ────────────────────────────────────────────────────

export type ReportMaintenanceParams = {
    roomId: string;
    type: MaintenanceType;
    issue: string;
    description?: string;
    priority?: Priority;
    estimatedCost?: number;
    scheduledDate?: Date;
    reportedById?: string;
};

export type ReportMaintenanceResult = {
    maintenance: {
        id: string;
        roomId: string;
        type: string;
        priority: string;
        status: string;
        issue: string;
        reportedAt: Date;
    };
    room: {
        id: string;
        roomNumber: string;
        status: string;
    };
};

/**
 * Report a maintenance issue for a room
 * Updates room status to MAINTENANCE
 */
export async function reportMaintenance(params: ReportMaintenanceParams) {
    const {
        roomId,
        type,
        issue,
        description,
        priority = 'MEDIUM',
        estimatedCost,
        scheduledDate,
        reportedById,
    } = params;

    return prisma.$transaction(async (tx) => {
        // Create maintenance record
        const maintenance = await tx.roomMaintenance.create({
            data: {
                roomId,
                type,
                priority,
                issue,
                description,
                estimatedCost: estimatedCost ? new Prisma.Decimal(estimatedCost) : undefined,
                scheduledDate,
                status: 'REPORTED',
                createdById: reportedById,
            },
        });

        // Update room status to MAINTENANCE
        const room = await tx.room.update({
            where: { id: roomId },
            data: {
                status: 'MAINTENANCE',
            },
        });

        return {
            maintenance: {
                id: maintenance.id,
                roomId: maintenance.roomId,
                type: maintenance.type,
                priority: maintenance.priority,
                status: maintenance.status,
                issue: maintenance.issue,
                reportedAt: maintenance.reportedAt,
            },
            room: {
                id: room.id,
                roomNumber: room.roomNumber,
                status: room.status,
            },
        };
    });
}

// ─── Update Maintenance Status ────────────────────────────────────────────

export type UpdateMaintenanceStatusParams = {
    maintenanceId: string;
    status: MaintenanceStatus;
    resolution?: string;
    resolvedBy?: string;
};

export type UpdateMaintenanceStatusResult = {
    maintenance: {
        id: string;
        roomId: string;
        status: string;
        startedAt: Date | null;
        completedAt: Date | null;
        resolution: string | null;
    };
    room: {
        id: string;
        roomNumber: string;
        status: string;
    };
};

/**
 * Update maintenance status
 * When status changes to IN_PROGRESS, records startedAt
 * When status changes to COMPLETED, records completedAt and restores room status
 */
export async function updateMaintenanceStatus(params: UpdateMaintenanceStatusParams) {
    const { maintenanceId, status, resolution, resolvedBy } = params;

    return prisma.$transaction(async (tx) => {
        const existing = await tx.roomMaintenance.findUnique({
            where: { id: maintenanceId },
            include: { room: true },
        });

        if (!existing) {
            throw new Error('MAINTENANCE_NOT_FOUND');
        }

        const updateData: any = {
            status,
            resolution: resolution || existing.resolution,
            resolvedBy: resolvedBy || existing.resolvedBy,
        };

        // Set timestamps based on status transition
        if (status === 'IN_PROGRESS' && !existing.startedAt) {
            updateData.startedAt = new Date();
        }

        if (status === 'COMPLETED') {
            updateData.completedAt = new Date();
        }

        const maintenance = await tx.roomMaintenance.update({
            where: { id: maintenanceId },
            data: updateData,
        });

        // If completed, restore room status to VACANT
        let room = existing.room;
        if (status === 'COMPLETED') {
            room = await tx.room.update({
                where: { id: existing.roomId },
                data: {
                    status: 'VACANT',
                },
            });
        }

        return {
            maintenance: {
                id: maintenance.id,
                roomId: maintenance.roomId,
                status: maintenance.status,
                startedAt: maintenance.startedAt,
                completedAt: maintenance.completedAt,
                resolution: maintenance.resolution,
            },
            room: {
                id: room.id,
                roomNumber: room.roomNumber,
                status: room.status,
            },
        };
    });
}

// ─── Complete Maintenance ──────────────────────────────────────────────────

export type CompleteMaintenanceParams = {
    maintenanceId: string;
    resolution: string;
    actualCost?: number;
    resolvedBy?: string;
};

export type CompleteMaintenanceResult = {
    maintenance: {
        id: string;
        roomId: string;
        status: string;
        completedAt: Date;
        resolution: string;
        actualCost: number | null;
    };
    room: {
        id: string;
        roomNumber: string;
        status: string;
    };
};

/**
 * Complete maintenance with resolution and actual cost
 * Restores room status to VACANT
 */
export async function completeMaintenance(params: CompleteMaintenanceParams) {
    const { maintenanceId, resolution, actualCost, resolvedBy } = params;

    return prisma.$transaction(async (tx) => {
        const existing = await tx.roomMaintenance.findUnique({
            where: { id: maintenanceId },
            include: { room: true },
        });

        if (!existing) {
            throw new Error('MAINTENANCE_NOT_FOUND');
        }

        if (existing.status === 'COMPLETED') {
            throw new Error('MAINTENANCE_ALREADY_COMPLETED');
        }

        // Update maintenance record
        const maintenance = await tx.roomMaintenance.update({
            where: { id: maintenanceId },
            data: {
                status: 'COMPLETED',
                resolution,
                resolvedBy,
                completedAt: new Date(),
                actualCost: actualCost ? new Prisma.Decimal(actualCost) : undefined,
            },
        });

        // Restore room status to VACANT
        const room = await tx.room.update({
            where: { id: existing.roomId },
            data: {
                status: 'VACANT',
            },
        });

        return {
            maintenance: {
                id: maintenance.id,
                roomId: maintenance.roomId,
                status: maintenance.status,
                completedAt: maintenance.completedAt!,
                resolution: maintenance.resolution!,
                actualCost: maintenance.actualCost?.toNumber() || null,
            },
            room: {
                id: room.id,
                roomNumber: room.roomNumber,
                status: room.status,
            },
        };
    });
}

// ─── Get Maintenance History ───────────────────────────────────────────────

export type GetMaintenanceHistoryParams = {
    roomId: string;
    options?: {
        status?: MaintenanceStatus;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        perPage?: number;
    };
};

export type GetMaintenanceHistoryResult = {
    maintenance: Array<{
        id: string;
        type: string;
        priority: string;
        status: string;
        issue: string;
        description: string | null;
        reportedAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
        resolution: string | null;
        estimatedCost: number | null;
        actualCost: number | null;
    }>;
    total: number;
    pages: number;
    page: number;
};

/**
 * Get maintenance history for a room
 */
export async function getRoomMaintenanceHistory(params: GetMaintenanceHistoryParams) {
    const { roomId, options = {} } = params;
    const { status, startDate, endDate, page = 1, perPage = 20 } = options;

    const where: any = { roomId };

    if (status) {
        where.status = status;
    }

    if (startDate || endDate) {
        where.reportedAt = {};
        if (startDate) where.reportedAt.gte = startDate;
        if (endDate) where.reportedAt.lte = endDate;
    }

    const [maintenance, total] = await Promise.all([
        prisma.roomMaintenance.findMany({
            where,
            orderBy: { reportedAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.roomMaintenance.count({ where }),
    ]);

    return {
        maintenance: maintenance.map(m => ({
            id: m.id,
            type: m.type,
            priority: m.priority,
            status: m.status,
            issue: m.issue,
            description: m.description,
            reportedAt: m.reportedAt,
            startedAt: m.startedAt,
            completedAt: m.completedAt,
            resolution: m.resolution,
            estimatedCost: m.estimatedCost?.toNumber() || null,
            actualCost: m.actualCost?.toNumber() || null,
        })),
        total,
        pages: Math.ceil(total / perPage),
        page,
    };
}

// ─── Get Active Maintenance ────────────────────────────────────────────────

/**
 * Get all active (non-completed) maintenance issues
 */
export async function getActiveMaintenance(propertyId: string = 'default') {
    return prisma.roomMaintenance.findMany({
        where: {
            status: { in: ['REPORTED', 'IN_PROGRESS'] },
            room: { propertyId },
        },
        include: {
            room: {
                select: {
                    id: true,
                    roomNumber: true,
                    type: true,
                    floor: true,
                },
            },
        },
        orderBy: [
            { priority: 'desc' },
            { reportedAt: 'asc' },
        ],
    });
}

// ─── Cancel Maintenance ───────────────────────────────────────────────────

export type CancelMaintenanceParams = {
    maintenanceId: string;
    reason: string;
    cancelledById?: string;
};

/**
 * Cancel a maintenance request
 * Restores room status if it was set to MAINTENANCE
 */
export async function cancelMaintenance(params: CancelMaintenanceParams) {
    const { maintenanceId, reason, cancelledById } = params;

    return prisma.$transaction(async (tx) => {
        const existing = await tx.roomMaintenance.findUnique({
            where: { id: maintenanceId },
        });

        if (!existing) {
            throw new Error('MAINTENANCE_NOT_FOUND');
        }

        if (existing.status === 'COMPLETED') {
            throw new Error('CANNOT_CANCEL_COMPLETED_MAINTENANCE');
        }

        // Update maintenance status
        const maintenance = await tx.roomMaintenance.update({
            where: { id: maintenanceId },
            data: {
                status: 'CANCELLED',
                resolution: reason,
                resolvedBy: cancelledById,
                completedAt: new Date(),
            },
        });

        // Restore room status to VACANT if it was in maintenance due to this issue
        const room = await tx.room.update({
            where: { id: existing.roomId },
            data: {
                status: 'VACANT',
            },
        });

        return {
            maintenance: {
                id: maintenance.id,
                status: maintenance.status,
                resolution: maintenance.resolution,
            },
            room: {
                id: room.id,
                roomNumber: room.roomNumber,
                status: room.status,
            },
        };
    });
}

// ─── Maintenance Statistics ────────────────────────────────────────────────

/**
 * Get maintenance statistics for a property
 */
export async function getMaintenanceStats(propertyId: string = 'default', startDate?: Date, endDate?: Date) {
    const where: any = {
        room: { propertyId },
    };

    if (startDate || endDate) {
        where.reportedAt = {};
        if (startDate) where.reportedAt.gte = startDate;
        if (endDate) where.reportedAt.lte = endDate;
    }

    const [total, byStatus, byType, byPriority, avgCost] = await Promise.all([
        prisma.roomMaintenance.count({ where }),
        prisma.roomMaintenance.groupBy({
            by: ['status'],
            where,
            _count: true,
        }),
        prisma.roomMaintenance.groupBy({
            by: ['type'],
            where,
            _count: true,
        }),
        prisma.roomMaintenance.groupBy({
            by: ['priority'],
            where,
            _count: true,
        }),
        prisma.roomMaintenance.aggregate({
            where: {
                ...where,
                actualCost: { not: null },
            },
            _avg: { actualCost: true },
        }),
    ]);

    return {
        total,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
        byType: byType.map(t => ({ type: t.type, count: t._count })),
        byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
        avgActualCost: avgCost._avg.actualCost?.toNumber() || null,
    };
}
