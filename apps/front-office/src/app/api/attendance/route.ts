import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { z } from "zod";
import { recordAttendance } from "@the-rooms/db/queries/shiftQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// Schema for recording attendance
const recordAttendanceSchema = z.object({
    staffId: z.string(),
    date: z.string().transform(s => new Date(s)),
    shiftTypeId: z.string().optional(),
    hoursWorked: z.number().min(0).max(24).optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY']),
    lateMinutes: z.number().min(0).optional(),
    earlyLeaveMinutes: z.number().min(0).optional(),
    notes: z.string().optional(),
    propertyId: z.string().optional(),
});

// POST /api/attendance
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Only ADMIN and SUPER_ADMIN can record attendance for any staff
        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to record attendance");
        }

        const body = await request.json();
        const parsed = recordAttendanceSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0]?.message || "Invalid input");
        }

        const data = parsed.data;

        // Verify staff exists
        const staff = await db.staffProfile.findUnique({
            where: { id: data.staffId },
        });

        if (!staff) {
            return badRequest("Staff member not found");
        }

        const attendance = await recordAttendance(data);

        // Create audit log
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "ATTENDANCE_RECORDED",
                entity: "staffAttendance",
                entityId: attendance.id,
                metadata: {
                    staffId: data.staffId,
                    staffName: staff.user?.name,
                    date: data.date.toISOString(),
                    status: data.status,
                    lateMinutes: data.lateMinutes || 0,
                    earlyLeaveMinutes: data.earlyLeaveMinutes || 0,
                },
            },
        });

        return created(attendance);
    } catch (error) {
        console.error("Error recording attendance:", error);
        return serverError();
    }
}
