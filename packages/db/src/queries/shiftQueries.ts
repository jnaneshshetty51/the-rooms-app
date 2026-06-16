import prisma from '../index';
import { ShiftStatus, AttendanceStatus, Department } from '@prisma/client';

/**
 * ─── Shift Management Queries (Scenario 54) ───────────────────────────────────
 *
 * Functions for:
 * - Creating and managing shift types
 * - Assigning shifts to staff
 * - Staff check-in/check-out
 * - Attendance recording
 */

// ─── Shift Type Queries ─────────────────────────────────────────────────────────

export interface CreateShiftTypeData {
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    gracePeriodMins?: number;
    isNightShift?: boolean;
    defaultFor?: Department;
}

/**
 * Create a new shift type
 */
export async function createShiftType(data: CreateShiftTypeData) {
    return prisma.shiftType.create({
        data: {
            name: data.name,
            code: data.code,
            startTime: data.startTime,
            endTime: data.endTime,
            durationHours: data.durationHours,
            gracePeriodMins: data.gracePeriodMins || 15,
            isNightShift: data.isNightShift || false,
            defaultFor: data.defaultFor,
        },
    });
}

/**
 * Update a shift type
 */
export async function updateShiftType(shiftTypeId: string, data: Partial<CreateShiftTypeData>) {
    return prisma.shiftType.update({
        where: { id: shiftTypeId },
        data,
    });
}

/**
 * Get all shift types
 */
export async function getShiftTypes() {
    return prisma.shiftType.findMany({
        orderBy: { name: 'asc' },
    });
}

/**
 * Get shift type by ID
 */
export async function getShiftTypeById(shiftTypeId: string) {
    return prisma.shiftType.findUnique({
        where: { id: shiftTypeId },
    });
}

/**
 * Initialize default shift types
 */
export async function initializeDefaultShiftTypes() {
    const defaultShifts = [
        {
            name: 'Morning Shift',
            code: 'MORNING',
            startTime: '06:00',
            endTime: '14:00',
            durationHours: 8,
            gracePeriodMins: 15,
            isNightShift: false,
            defaultFor: Department.FRONT_OFFICE as Department,
        },
        {
            name: 'Evening Shift',
            code: 'EVENING',
            startTime: '14:00',
            endTime: '22:00',
            durationHours: 8,
            gracePeriodMins: 15,
            isNightShift: false,
            defaultFor: Department.FRONT_OFFICE as Department,
        },
        {
            name: 'Night Shift',
            code: 'NIGHT',
            startTime: '22:00',
            endTime: '06:00',
            durationHours: 8,
            gracePeriodMins: 30,
            isNightShift: true,
            defaultFor: Department.FRONT_OFFICE as Department,
        },
    ];

    const results = [];
    for (const shift of defaultShifts) {
        const existing = await prisma.shiftType.findUnique({
            where: { code: shift.code },
        });

        if (!existing) {
            const created = await prisma.shiftType.create({ data: shift });
            results.push(created);
        }
    }

    return results;
}

// ─── Staff Shift Queries ───────────────────────────────────────────────────────

export interface AssignShiftData {
    staffId: string;
    shiftTypeId: string;
    date: Date;
    propertyId?: string;
}

/**
 * Assign a shift to a staff member
 */
export async function assignShift(data: AssignShiftData) {
    const { staffId, shiftTypeId, date, propertyId = 'default' } = data;

    // Normalize date to start of day
    const shiftDate = new Date(date);
    shiftDate.setHours(0, 0, 0, 0);

    return prisma.staffShift.upsert({
        where: {
            staffId_shiftDate: {
                staffId,
                shiftDate,
            },
        },
        create: {
            staffId,
            shiftTypeId,
            shiftDate,
            propertyId,
            status: 'SCHEDULED',
        },
        update: {
            shiftTypeId,
        },
        include: {
            staff: {
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
            shiftType: true,
        },
    });
}

/**
 * Get staff shifts for a date range
 */
export async function getStaffShifts(staffId: string, startDate: Date, endDate: Date) {
    return prisma.staffShift.findMany({
        where: {
            staffId,
            shiftDate: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            shiftType: true,
        },
        orderBy: { shiftDate: 'asc' },
    });
}

/**
 * Get shifts for a specific date
 */
export async function getShiftsForDate(date: Date, propertyId: string = 'default') {
    const shiftDate = new Date(date);
    shiftDate.setHours(0, 0, 0, 0);

    return prisma.staffShift.findMany({
        where: {
            shiftDate,
            propertyId,
        },
        include: {
            staff: {
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
            shiftType: true,
        },
        orderBy: [
            { status: 'asc' },
            { staff: { user: { name: 'asc' } } },
        ],
    });
}

/**
 * Check in to a shift
 */
export async function checkInToShift(shiftId: string, checkInTime?: Date) {
    const time = checkInTime || new Date();

    return prisma.staffShift.update({
        where: { id: shiftId },
        data: {
            checkInTime: time,
            status: 'CHECKED_IN',
        },
        include: {
            staff: {
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
            shiftType: true,
        },
    });
}

/**
 * Check out from a shift
 */
export async function checkOutFromShift(shiftId: string, checkOutTime?: Date) {
    const time = checkOutTime || new Date();

    // Get the shift to calculate overtime
    const shift = await prisma.staffShift.findUnique({
        where: { id: shiftId },
        include: { shiftType: true },
    });

    if (!shift || !shift.checkInTime) {
        throw new Error('Shift not found or not checked in');
    }

    // Calculate overtime hours
    let overtimeHours = 0;
    if (shift.shiftType) {
        const shiftEnd = new Date(time);
        const [endHour, endMin] = shift.shiftType.endTime.split(':').map(Number);
        shiftEnd.setHours(endHour, endMin, 0, 0);

        // Handle overnight shifts
        if (shift.shiftType.isNightShift && time.getHours() < 12) {
            shiftEnd.setDate(shiftEnd.getDate() + 1);
        }

        if (time > shiftEnd) {
            const diff = time.getTime() - shiftEnd.getTime();
            overtimeHours = Math.max(0, diff / (1000 * 60 * 60));
        }
    }

    return prisma.staffShift.update({
        where: { id: shiftId },
        data: {
            checkOutTime: time,
            status: 'CHECKED_OUT',
            overtimeHours: overtimeHours > 0 ? overtimeHours : null,
        },
        include: {
            staff: {
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
            shiftType: true,
        },
    });
}

/**
 * Mark shift as absent
 */
export async function markShiftAbsent(shiftId: string, reason?: string) {
    return prisma.staffShift.update({
        where: { id: shiftId },
        data: {
            status: 'ABSENT',
        },
        include: {
            staff: {
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
            shiftType: true,
        },
    });
}

// ─── Attendance Queries ─────────────────────────────────────────────────────────

export interface RecordAttendanceData {
    staffId: string;
    date: Date;
    shiftTypeId?: string;
    hoursWorked?: number;
    status: AttendanceStatus;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
    notes?: string;
    propertyId?: string;
}

/**
 * Record staff attendance
 */
export async function recordAttendance(data: RecordAttendanceData) {
    const { staffId, date, shiftTypeId, hoursWorked = 0, status, lateMinutes = 0, earlyLeaveMinutes = 0, notes, propertyId = 'default' } = data;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    return prisma.staffAttendance.upsert({
        where: {
            staffId_attendanceDate: {
                staffId,
                attendanceDate,
            },
        },
        create: {
            staffId,
            attendanceDate,
            shiftTypeId,
            hoursWorked,
            status,
            lateMinutes,
            earlyLeaveMinutes,
            notes,
            propertyId,
        },
        update: {
            shiftTypeId,
            hoursWorked,
            status,
            lateMinutes,
            earlyLeaveMinutes,
            notes,
        },
        include: {
            staff: {
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
 * Get attendance for a specific date
 */
export async function getAttendanceForDate(date: Date, propertyId: string = 'default') {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    return prisma.staffAttendance.findMany({
        where: {
            attendanceDate,
            propertyId,
        },
        include: {
            staff: {
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
        orderBy: {
            staff: {
                user: { name: 'asc' },
            },
        },
    });
}

/**
 * Get attendance report for a date range
 */
export type AttendanceReportItem = {
    staffId: string;
    staffName: string;
    department: Department;
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    onLeave: number;
    totalHoursWorked: number;
    avgHoursPerDay: number;
    lateMinutes: number;
};

export async function getAttendanceReport(
    startDate: Date,
    endDate: Date,
    department?: Department,
    propertyId: string = 'default'
) {
    // Build the where clause
    const whereClause: any = {
        attendanceDate: {
            gte: startDate,
            lte: endDate,
        },
        propertyId,
    };

    // Get all staff with optional department filter
    const staffWhere: any = { isActive: true };
    if (department) {
        staffWhere.department = department;
    }

    const staffMembers = await prisma.staffProfile.findMany({
        where: staffWhere,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
            attendances: {
                where: {
                    attendanceDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            },
        },
    });

    const report: AttendanceReportItem[] = staffMembers.map((staff) => {
        const attendances = staff.attendances;
        const totalDays = attendances.length;
        const present = attendances.filter((a) => a.status === 'PRESENT').length;
        const absent = attendances.filter((a) => a.status === 'ABSENT').length;
        const late = attendances.filter((a) => a.status === 'LATE').length;
        const halfDay = attendances.filter((a) => a.status === 'HALF_DAY').length;
        const onLeave = attendances.filter((a) => a.status === 'ON_LEAVE').length;
        const totalHoursWorked = attendances.reduce((sum, a) => sum + Number(a.hoursWorked), 0);
        const avgHoursPerDay = totalDays > 0 ? totalHoursWorked / totalDays : 0;
        const totalLateMinutes = attendances.reduce((sum, a) => sum + a.lateMinutes, 0);

        return {
            staffId: staff.id,
            staffName: staff.user?.name || 'Unknown',
            department: staff.department,
            totalDays,
            present,
            absent,
            late,
            halfDay,
            onLeave,
            totalHoursWorked,
            avgHoursPerDay,
            lateMinutes: totalLateMinutes,
        };
    });

    return {
        startDate,
        endDate,
        department: department || 'ALL',
        propertyId,
        report,
        summary: {
            totalStaff: report.length,
            avgAttendanceRate: report.length > 0
                ? (report.reduce((sum, r) => sum + (r.present / Math.max(r.totalDays, 1)), 0) / report.length) * 100
                : 0,
            totalLateMinutes: report.reduce((sum, r) => sum + r.lateMinutes, 0),
        },
    };
}

/**
 * Get staff attendance history
 */
export async function getStaffAttendanceHistory(staffId: string, startDate: Date, endDate: Date) {
    return prisma.staffAttendance.findMany({
        where: {
            staffId,
            attendanceDate: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: { attendanceDate: 'desc' },
    });
}
