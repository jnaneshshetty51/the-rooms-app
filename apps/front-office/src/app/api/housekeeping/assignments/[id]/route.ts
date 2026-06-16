import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@the-rooms/api/response";
import { z } from "zod";
import { reassignHousekeepingTask } from "@the-rooms/db/queries/staffQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// Schema for reassignment
const reassignSchema = z.object({
    newStaffId: z.string(),
    reason: z.string().optional(),
});

// PATCH /api/housekeeping/assignments/[id]
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Role check
        const userRole = session.user.role;
        if (!['ADMIN', 'FRONT_OFFICE', 'HOUSEKEEPING', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to reassign housekeeping tasks");
        }

        const taskId = params.id;
        const body = await request.json();
        const parsed = reassignSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0]?.message || "Invalid input");
        }

        const { newStaffId, reason } = parsed.data;

        // Verify task exists
        const task = await db.housekeepingTask.findUnique({
            where: { id: taskId },
            include: { room: true },
        });

        if (!task) {
            return notFound("Task");
        }

        // Verify new staff exists
        const newStaff = await db.staffProfile.findUnique({
            where: { id: newStaffId },
            include: { user: true },
        });

        if (!newStaff) {
            return badRequest("New staff member not found");
        }

        const result = await reassignHousekeepingTask(taskId, newStaffId, reason);

        // Create audit log
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "HOUSEKEEPING_REASSIGNED",
                entity: "housekeepingTask",
                entityId: taskId,
                metadata: {
                    roomId: task.roomId,
                    roomNumber: task.room.roomNumber,
                    previousStaffId: task.assigneeId,
                    newStaffId,
                    newStaffName: newStaff.user?.name,
                    reason,
                },
            },
        });

        return ok(result);
    } catch (error) {
        console.error("Error reassigning housekeeping task:", error);
        return serverError();
    }
}
