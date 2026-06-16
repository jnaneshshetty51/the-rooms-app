import prisma from '../index';
import { Prisma, Department } from '@prisma/client';

/**
 * ─── Staff & Housekeeping Queries ─────────────────────────────────────────────
 *
 * Functions for:
 * - Scenario 51: Housekeeping staff assignment to rooms
 * - Scenario 53: Staff profile management & role-based permissions
 */

// ─── Staff Profile Queries (Scenario 53) ───────────────────────────────────────

export interface CreateStaffProfileData {
    userId: string;
    employeeId?: string;
    department?: Department;
    designation?: string;
    hireDate?: Date;
    personalPhone?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
}

export interface UpdateStaffProfileData {
    employeeId?: string;
    department?: Department;
    designation?: string;
    terminationDate?: Date;
    personalPhone?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    isActive?: boolean;
}

/**
 * Create a staff profile for an existing user
 */
export async function createStaffProfile(data: CreateStaffProfileData) {
    return prisma.staffProfile.create({
        data: {
            userId: data.userId,
            employeeId: data.employeeId,
            department: data.department || Department.FRONT_OFFICE,
            designation: data.designation,
            hireDate: data.hireDate,
            personalPhone: data.personalPhone,
            emergencyContact: data.emergencyContact,
            emergencyPhone: data.emergencyPhone,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
        },
    });
}

/**
 * Update a staff profile
 */
export async function updateStaffProfile(staffId: string, data: UpdateStaffProfileData) {
    return prisma.staffProfile.update({
        where: { id: staffId },
        data,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
        },
    });
}

/**
 * Get staff profile by user ID
 */
export async function getStaffProfileByUserId(userId: string) {
    return prisma.staffProfile.findUnique({
        where: { userId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                },
            },
            housekeepingStaff: true,
        },
    });
}

/**
 * Get staff profile by ID
 */
export async function getStaffProfileById(staffId: string) {
    return prisma.staffProfile.findUnique({
        where: { id: staffId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                },
            },
            housekeepingStaff: true,
            shifts: {
                include: {
                    shiftType: true,
                },
                orderBy: { shiftDate: 'desc' },
                take: 10,
            },
            attendances: {
                orderBy: { attendanceDate: 'desc' },
                take: 10,
            },
        },
    });
}

/**
 * Get all staff by department
 */
export async function getStaffByDepartment(department: Department) {
    return prisma.staffProfile.findMany({
        where: {
            department,
            isActive: true,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
        },
        orderBy: [
            { isActive: 'desc' },
            { user: { name: 'asc' } },
        ],
    });
}

/**
 * Get all active staff
 */
export async function getActiveStaff() {
    return prisma.staffProfile.findMany({
        where: { isActive: true },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
        },
        orderBy: [
            { department: 'asc' },
            { user: { name: 'asc' } },
        ],
    });
}

/**
 * Get all staff profiles with optional filters
 */
export async function getAllStaffProfiles(filters?: {
    department?: Department;
    isActive?: boolean;
    search?: string;
}) {
    const where: any = {};

    if (filters?.department) {
        where.department = filters.department;
    }

    if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
    }

    if (filters?.search) {
        where.user = {
            OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ],
        };
    }

    return prisma.staffProfile.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
            housekeepingStaff: true,
        },
        orderBy: [
            { department: 'asc' },
            { user: { name: 'asc' } },
        ],
    });
}

// ─── Housekeeping Staff Queries ─────────────────────────────────────────────────

/**
 * Get or create housekeeping staff profile
 */
export async function getOrCreateHousekeepingStaff(staffProfileId: string) {
    return prisma.housekeepingStaff.upsert({
        where: { staffProfileId },
        create: {
            staffProfileId,
            specializations: [],
        },
        update: {},
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
 * Update housekeeping staff details
 */
export async function updateHousekeepingStaff(
    staffProfileId: string,
    data: {
        specializations?: string[];
        avgCleanTimeMins?: number;
        qualityScore?: number;
    }
) {
    return prisma.housekeepingStaff.update({
        where: { staffProfileId },
        data: {
            ...data,
            lastEvaluatedAt: data.qualityScore ? new Date() : undefined,
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

// ─── Housekeeping Assignment Queries (Scenario 51) ──────────────────────────────

export type HousekeepingAssignmentResult = {
    task: {
        id: string;
        roomId: string;
        assigneeId: string;
        date: Date;
        status: string;
        priority: string;
    };
    room: {
        id: string;
        roomNumber: string;
        cleaningStatus: string;
    };
};

/**
 * Assign housekeeping staff to a room
 * Creates or updates a HousekeepingTask with the assignment
 */
export async function assignHousekeepingStaff(
    roomId: string,
    staffId: string,
    date: Date,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM',
    options: {
        notes?: string;
        propertyId?: string;
    } = {}
) {
    const { notes, propertyId = 'default' } = options;

    return prisma.$transaction(async (tx) => {
        // Check if there's already an active task for this room today
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const existingTask = await tx.housekeepingTask.findFirst({
            where: {
                roomId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: { in: ['PENDING', 'IN_PROGRESS'] },
            },
        });

        let task;
        if (existingTask) {
            // Update existing task with new assignee
            task = await tx.housekeepingTask.update({
                where: { id: existingTask.id },
                data: {
                    assigneeId: staffId,
                    notes: notes || existingTask.notes,
                },
            });
        } else {
            // Create new task
            task = await tx.housekeepingTask.create({
                data: {
                    roomId,
                    assigneeId: staffId,
                    date,
                    status: 'PENDING',
                    notes: notes || `Assigned to ${staffId}`,
                },
            });
        }

        // Update room cleaning status to CLEANING if it was dirty
        const room = await tx.room.update({
            where: { id: roomId },
            data: {
                cleaningStatus: 'CLEANING',
            },
            select: {
                id: true,
                roomNumber: true,
                cleaningStatus: true,
            },
        });

        return {
            task: {
                id: task.id,
                roomId: task.roomId,
                assigneeId: task.assigneeId,
                date: task.date,
                status: task.status,
                priority,
            },
            room: {
                id: room.id,
                roomNumber: room.roomNumber,
                cleaningStatus: room.cleaningStatus,
            },
        };
    });
}

/**
 * Get housekeeping assignments for a specific staff member and date
 */
export async function getHousekeepingAssignments(date: Date, staffId: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.housekeepingTask.findMany({
        where: {
            assigneeId: staffId,
            date: {
                gte: startOfDay,
                lte: endOfDay,
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
        },
        orderBy: [
            { status: 'asc' },
            { room: { floor: 'asc' } },
            { room: { roomNumber: 'asc' } },
        ],
    });
}

/**
 * Get all pending housekeeping tasks for a date
 */
export async function getPendingHousekeepingTasks(date: Date, propertyId: string = 'default') {
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
            status: { in: ['PENDING', 'IN_PROGRESS'] },
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
 * Reassign a housekeeping task to a different staff member
 */
export async function reassignHousekeepingTask(taskId: string, newStaffId: string, reason?: string) {
    return prisma.housekeepingTask.update({
        where: { id: taskId },
        data: {
            assigneeId: newStaffId,
            notes: reason ? `Reassigned: ${reason}` : undefined,
        },
        include: {
            room: {
                select: {
                    id: true,
                    roomNumber: true,
                    type: true,
                },
            },
            assignee: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
}

/**
 * Get housekeeping tasks for a room (all or recent)
 */
export async function getHousekeepingTasksForRoom(roomId: string, limit: number = 10) {
    return prisma.housekeepingTask.findMany({
        where: { roomId },
        include: {
            assignee: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: { date: 'desc' },
        take: limit,
    });
}

// ─── Housekeeping Completion Tracking (Scenario 52) ───────────────────────────

export type UpdateTaskStatusResult = {
    task: {
        id: string;
        status: string;
        notes: string | null;
    };
    room: {
        id: string;
        roomNumber: string;
        cleaningStatus: string;
        lastCleanedAt: Date | null;
    };
    staff: {
        roomsCleanedToday: number;
        roomsCleanedMonth: number;
    };
};

/**
 * Update housekeeping task status
 * Also updates room status and staff counters on completion
 */
export async function updateHousekeepingTaskStatus(
    taskId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
    notes?: string,
    photos?: string[],
    checklistResults?: Record<string, boolean>
) {
    return prisma.$transaction(async (tx) => {
        // Get current task
        const task = await tx.housekeepingTask.findUnique({
            where: { id: taskId },
            include: {
                room: true,
            },
        });

        if (!task) {
            throw new Error('Task not found');
        }

        // Update task status
        const updatedTask = await tx.housekeepingTask.update({
            where: { id: taskId },
            data: {
                status,
                notes: notes || task.notes,
                photoUrl: photos && photos.length > 0 ? photos[0] : task.photoUrl,
            },
        });

        let roomUpdate: any = {};
        let staffStats = { roomsCleanedToday: 0, roomsCleanedMonth: 0 };

        // If completed, update room status and staff counters
        if (status === 'COMPLETED') {
            roomUpdate = {
                cleaningStatus: 'CLEAN',
                lastCleanedAt: new Date(),
                cleanedById: task.assigneeId,
            };

            // Update housekeeping staff counters
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            await tx.housekeepingStaff.updateMany({
                where: { staffProfileId: task.assigneeId },
                data: {
                    roomsCleanedToday: { increment: 1 },
                    roomsCleanedMonth: { increment: 1 },
                },
            });

            // Get updated staff stats
            const hkStaff = await tx.housekeepingStaff.findFirst({
                where: { staffProfileId: task.assigneeId },
            });

            if (hkStaff) {
                staffStats = {
                    roomsCleanedToday: hkStaff.roomsCleanedToday,
                    roomsCleanedMonth: hkStaff.roomsCleanedMonth,
                };
            }

            // Create room inspection record
            await tx.roomInspection.create({
                data: {
                    roomId: task.roomId,
                    type: 'POST_CHECKOUT',
                    date: new Date(),
                    inspectorId: task.assigneeId,
                    checklistResults: checklistResults as any || {},
                    overallStatus: 'PASS',
                    taskId: task.id,
                },
            });
        } else if (status === 'IN_PROGRESS') {
            roomUpdate.cleaningStatus = 'CLEANING';
        }

        // Update room
        const room = await tx.room.update({
            where: { id: task.roomId },
            data: roomUpdate,
            select: {
                id: true,
                roomNumber: true,
                cleaningStatus: true,
                lastCleanedAt: true,
            },
        });

        return {
            task: {
                id: updatedTask.id,
                status: updatedTask.status,
                notes: updatedTask.notes,
            },
            room: {
                id: room.id,
                roomNumber: room.roomNumber,
                cleaningStatus: room.cleaningStatus,
                lastCleanedAt: room.lastCleanedAt,
            },
            staff: staffStats,
        };
    });
}

/**
 * Get housekeeping task progress for a date
 */
export type HousekeepingTaskProgress = {
    date: Date;
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    completionRate: number;
    byStaff: Array<{
        staffId: string;
        staffName: string;
        assigned: number;
        completed: number;
        completionRate: number;
    }>;
};

export async function getHousekeepingTaskProgress(date: Date, propertyId: string = 'default') {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await prisma.housekeepingTask.findMany({
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
            assignee: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'PENDING').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Group by staff
    const staffMap = new Map<string, { name: string; assigned: number; completed: number }>();
    for (const task of tasks) {
        const staffId = task.assigneeId;
        const existing = staffMap.get(staffId);
        if (existing) {
            existing.assigned++;
            if (task.status === 'COMPLETED') existing.completed++;
        } else {
            staffMap.set(staffId, {
                name: task.assignee?.name || 'Unknown',
                assigned: 1,
                completed: task.status === 'COMPLETED' ? 1 : 0,
            });
        }
    }

    const byStaff = Array.from(staffMap.entries()).map(([staffId, data]) => ({
        staffId,
        staffName: data.name,
        assigned: data.assigned,
        completed: data.completed,
        completionRate: data.assigned > 0 ? (data.completed / data.assigned) * 100 : 0,
    }));

    return {
        date,
        total,
        pending,
        inProgress,
        completed,
        completionRate,
        byStaff,
    };
}

/**
 * Get housekeeping task history for a room
 */
export async function getHousekeepingTaskHistory(roomId: string, limit: number = 30) {
    return prisma.housekeepingTask.findMany({
        where: { roomId },
        include: {
            assignee: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: { date: 'desc' },
        take: limit,
    });
}
