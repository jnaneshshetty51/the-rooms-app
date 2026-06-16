import prisma from '../index';

// ─── Staff Activity Log Queries (Scenario 55) ───────────────────────────────────

export interface LogActivityData {
    staffId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
    notes?: string;
    ipAddress?: string;
    userAgent?: string;
    propertyId?: string;
}

/**
 * Log a staff activity
 */
export async function logStaffActivity(data: LogActivityData) {
    const {
        staffId,
        action,
        entityType,
        entityId,
        oldValue,
        newValue,
        notes,
        ipAddress,
        userAgent,
        propertyId = 'default',
    } = data;

    return prisma.staffActivityLog.create({
        data: {
            staffId,
            action,
            entityType,
            entityId,
            oldValue: oldValue as any,
            newValue: newValue as any,
            notes,
            ipAddress,
            userAgent,
            propertyId,
        },
        include: {
            staffProfile: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });
}

/**
 * Get activities for a specific staff member
 */
export async function getStaffActivities(
    staffId: string,
    date?: Date,
    options: {
        limit?: number;
        offset?: number;
        action?: string;
        entityType?: string;
    } = {}
) {
    const { limit = 50, offset = 0, action, entityType } = options;

    const where: any = { staffId };

    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt = {
            gte: startOfDay,
            lte: endOfDay,
        };
    }

    if (action) {
        where.action = action;
    }

    if (entityType) {
        where.entityType = entityType;
    }

    const [activities, total] = await Promise.all([
        prisma.staffActivityLog.findMany({
            where,
            include: {
                staffProfile: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.staffActivityLog.count({ where }),
    ]);

    return {
        activities,
        total,
        limit,
        offset,
    };
}

/**
 * Get recent activities across all staff or for a property
 */
export async function getRecentActivities(propertyId: string = 'default', limit: number = 50) {
    return prisma.staffActivityLog.findMany({
        where: { propertyId },
        include: {
            staffProfile: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}

/**
 * Search staff activities with query and filters
 */
export async function searchStaffActivities(
    query: string,
    filters: {
        staffId?: string;
        startDate?: Date;
        endDate?: Date;
        action?: string;
        entityType?: string;
        propertyId?: string;
    } = {}
) {
    const {
        staffId,
        startDate,
        endDate,
        action,
        entityType,
        propertyId = 'default',
    } = filters;

    const where: any = { propertyId };

    if (staffId) {
        where.staffId = staffId;
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
            where.createdAt.gte = startDate;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt.lte = end;
        }
    }

    if (action) {
        where.action = { contains: action, mode: 'insensitive' };
    }

    if (entityType) {
        where.entityType = entityType;
    }

    if (query) {
        where.OR = [
            { notes: { contains: query, mode: 'insensitive' } },
            { action: { contains: query, mode: 'insensitive' } },
        ];
    }

    return prisma.staffActivityLog.findMany({
        where,
        include: {
            staffProfile: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
}

/**
 * Get activity summary for a staff member
 */
export async function getStaffActivitySummary(
    staffId: string,
    startDate: Date,
    endDate: Date
) {
    const where = {
        staffId,
        createdAt: {
            gte: startDate,
            lte: endDate,
        },
    };

    const [activities, counts] = await Promise.all([
        prisma.staffActivityLog.findMany({
            where,
            select: {
                action: true,
                entityType: true,
            },
        }),
        prisma.staffActivityLog.groupBy({
            by: ['action'],
            where,
            _count: true,
        }),
    ]);

    // Count by action type
    const byAction = counts.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
    }, {} as Record<string, number>);

    // Count by entity type
    const byEntityType: Record<string, number> = {};
    for (const activity of activities) {
        if (activity.entityType) {
            byEntityType[activity.entityType] = (byEntityType[activity.entityType] || 0) + 1;
        }
    }

    return {
        total: activities.length,
        byAction,
        byEntityType,
        dateRange: {
            start: startDate,
            end: endDate,
        },
    };
}

/**
 * Get activity statistics for a property
 */
export async function getActivityStatistics(propertyId: string = 'default', days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const activities = await prisma.staffActivityLog.findMany({
        where: {
            propertyId,
            createdAt: {
                gte: startDate,
            },
        },
        include: {
            staffProfile: {
                select: {
                    id: true,
                    user: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    // Group by date
    const byDate: Record<string, number> = {};
    const byStaff: Record<string, { name: string; count: number }> = {};
    const byAction: Record<string, number> = {};

    for (const activity of activities) {
        const dateKey = activity.createdAt.toISOString().split('T')[0];
        byDate[dateKey] = (byDate[dateKey] || 0) + 1;

        const staffId = activity.staffId;
        if (!byStaff[staffId]) {
            byStaff[staffId] = {
                name: activity.staffProfile?.user?.name || 'Unknown',
                count: 0,
            };
        }
        byStaff[staffId].count++;

        byAction[activity.action] = (byAction[activity.action] || 0) + 1;
    }

    return {
        period: {
            start: startDate,
            end: new Date(),
            days,
        },
        total: activities.length,
        byDate,
        byStaff: Object.entries(byStaff).map(([id, data]) => ({
            staffId: id,
            ...data,
        })),
        byAction,
    };
}

/**
 * Delete old activity logs (for cleanup/maintenance)
 */
export async function deleteOldActivityLogs(beforeDate: Date) {
    const result = await prisma.staffActivityLog.deleteMany({
        where: {
            createdAt: {
                lt: beforeDate,
            },
        },
    });

    return {
        deleted: result.count,
        beforeDate,
    };
}
