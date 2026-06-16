import prisma from '../index';
import { Decimal } from '@prisma/client/runtime/library';
import { RoomCondition } from '@prisma/client';

/**
 * ─── Housekeeping Queries ─────────────────────────────────────────────────
 *
 * Functions for housekeeping management including:
 * - Marking rooms dirty after checkout
 * - Marking rooms clean after housekeeping
 * - Creating housekeeping tasks
 * - Room inspection recording
 */

// ─── Mark Room Dirty (Scenario 41) ────────────────────────────────────────

export type MarkRoomDirtyResult = {
    room: {
        id: string;
        roomNumber: string;
        cleaningStatus: string;
    };
    task: {
        id: string;
        status: string;
    };
};

/**
 * Mark a room as dirty after checkout
 * Creates a HousekeepingTask with VACANT_DIRTY status
 * Updates room cleaningStatus
 */
export async function markRoomDirty(
    roomId: string,
    checkoutBookingId?: string,
    options: {
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
        notes?: string;
        reportedById?: string;
    } = {}
) {
    const { priority = 'MEDIUM', notes, reportedById } = options;

    return prisma.$transaction(async (tx) => {
        // Update room cleaning status to DIRTY
        const room = await tx.room.update({
            where: { id: roomId },
            data: {
                cleaningStatus: 'DIRTY',
                cleaningNotes: notes ? `[Checkout]: ${notes}` : '[Checkout]: Room marked dirty after checkout',
            },
        });

        // Create housekeeping task
        const task = await tx.housekeepingTask.create({
            data: {
                roomId,
                assigneeId: reportedById || 'system',
                date: new Date(),
                status: 'PENDING',
                notes: notes || `Room marked dirty after checkout${checkoutBookingId ? ` (Booking: ${checkoutBookingId})` : ''}`,
            },
        });

        return {
            room: {
                id: room.id,
                roomNumber: room.roomNumber,
                cleaningStatus: room.cleaningStatus,
            },
            task: {
                id: task.id,
                status: task.status,
            },
        };
    });
}

// ─── Mark Room Clean (Scenario 42) ───────────────────────────────────────

export type MarkRoomCleanResult = {
    room: {
        id: string;
        roomNumber: string;
        cleaningStatus: string;
        lastCleanedAt: Date;
    };
    task: {
        id: string;
        status: string;
    };
    inspection: {
        id: string;
        overallStatus: string;
    } | null;
};

export interface MarkRoomCleanParams {
    roomId: string;
    taskId: string;
    staffId: string;
    options?: {
        notes?: string;
        checklistResults?: Record<string, boolean>;
        photos?: string[];
        issues?: string;
    };
}

/**
 * Mark a room as clean after housekeeping
 * Updates HousekeepingTask status to COMPLETED
 * Updates room cleaningStatus to VACANT_CLEAN (CLEAN)
 * Creates RoomInspection record
 */
export async function markRoomClean(params: MarkRoomCleanParams) {
    const { roomId, taskId, staffId, options = {} } = params;
    const { notes, checklistResults = {}, photos = [], issues } = options;

    return prisma.$transaction(async (tx) => {
        // Update housekeeping task to COMPLETED
        const task = await tx.housekeepingTask.update({
            where: { id: taskId },
            data: {
                status: 'COMPLETED',
                notes: notes || 'Room cleaned and ready for next guest',
                photoUrl: photos.length > 0 ? photos[0] : undefined,
            },
        });

        // Update room to CLEAN status
        const room = await tx.room.update({
            where: { id: roomId },
            data: {
                cleaningStatus: 'CLEAN',
                lastCleanedAt: new Date(),
                cleanedById: staffId,
                cleaningNotes: notes ? `[${new Date().toISOString().split('T')[0]}]: ${notes}` : undefined,
            },
        });

        // Create room inspection record
        const inspection = await tx.roomInspection.create({
            data: {
                roomId,
                type: 'POST_CHECKOUT',
                date: new Date(),
                inspectorId: staffId,
                checklistResults: checklistResults as any,
                overallStatus: issues ? 'CONDITIONAL_PASS' : 'PASS',
                issues: issues || null,
                photos,
                taskId,
            },
        });

        return {
            room: {
                id: room.id,
                roomNumber: room.roomNumber,
                cleaningStatus: room.cleaningStatus,
                lastCleanedAt: room.lastCleanedAt!,
            },
            task: {
                id: task.id,
                status: task.status,
            },
            inspection: {
                id: inspection.id,
                overallStatus: inspection.overallStatus,
            },
        };
    });
}

// ─── Housekeeping Task Queries ──────────────────────────────────────────────

/**
 * Get housekeeping tasks for a date
 */
export async function getHousekeepingTasks(date: Date, propertyId: string = 'default') {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.housekeepingTask.findMany({
        where: {
            date: {
                gte: startOfDay,
                lte: endOfDay,
            },
            room: {
                propertyId,
            },
        },
        include: {
            room: {
                select: {
                    id: true,
                    roomNumber: true,
                    type: true,
                    floor: true,
                    cleaningStatus: true,
                },
            },
            assignee: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: [
            { status: 'asc' },
            { room: { floor: 'asc' } },
            { room: { roomNumber: 'asc' } },
        ],
    });
}

/**
 * Get pending housekeeping tasks for a room
 */
export async function getPendingTasksForRoom(roomId: string) {
    return prisma.housekeepingTask.findMany({
        where: {
            roomId,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        orderBy: { date: 'desc' },
    });
}

/**
 * Update housekeeping task status
 */
export async function updateHousekeepingTaskStatus(
    taskId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
    notes?: string
) {
    return prisma.housekeepingTask.update({
        where: { id: taskId },
        data: {
            status,
            notes: notes || undefined,
        },
        include: {
            room: {
                select: {
                    id: true,
                    roomNumber: true,
                    type: true,
                },
            },
        },
    });
}

/**
 * Get rooms by cleaning status with task info
 */
export async function getRoomsWithHousekeepingStatus(propertyId: string = 'default') {
    return prisma.room.findMany({
        where: { propertyId },
        include: {
            housekeepingTasks: {
                where: {
                    date: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
            cleanedBy: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: [
            { cleaningStatus: 'asc' },
            { floor: 'asc' },
            { roomNumber: 'asc' },
        ],
    });
}

/**
 * Get housekeeping staff performance stats
 */
export async function getHousekeepingStaffStats(staffId: string, month?: Date) {
    const startOfMonth = month || new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const [tasksCompleted, tasksTotal] = await Promise.all([
        prisma.housekeepingTask.count({
            where: {
                assigneeId: staffId,
                status: 'COMPLETED',
                updatedAt: {
                    gte: startOfMonth,
                    lt: endOfMonth,
                },
            },
        }),
        prisma.housekeepingTask.count({
            where: {
                assigneeId: staffId,
                date: {
                    gte: startOfMonth,
                    lt: endOfMonth,
                },
            },
        }),
    ]);

    return {
        staffId,
        month: startOfMonth,
        tasksCompleted,
        tasksTotal,
        completionRate: tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0,
    };
}
