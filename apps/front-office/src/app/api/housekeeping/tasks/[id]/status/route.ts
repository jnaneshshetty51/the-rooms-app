import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@the-rooms/api/response";
import { z } from "zod";
import { updateHousekeepingTaskStatus } from "@the-rooms/db/queries/staffQueries";
import { logStaffActivity } from "@the-rooms/db/queries/staffActivityQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// Schema for status update
const updateStatusSchema = z.object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
    notes: z.string().optional(),
    photos: z.array(z.string()).optional(),
    checklistResults: z.record(z.boolean()).optional(),
});

// PATCH /api/housekeeping/tasks/[id]/status
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Role check - HOUSEKEEPING role or admin can update
        const userRole = session.user.role;
        if (!['ADMIN', 'FRONT_OFFICE', 'HOUSEKEEPING', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to update housekeeping tasks");
        }

        const taskId = params.id;
        const body = await request.json();
        const parsed = updateStatusSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0]?.message || "Invalid input");
        }

        const { status, notes, photos, checklistResults } = parsed.data;

        // Verify task exists
        const task = await db.housekeepingTask.findUnique({
            where: { id: taskId },
            include: { room: true },
        });

        if (!task) {
            return notFound("Task");
        }

        // Get staff profile for activity logging
        const staffProfile = await db.staffProfile.findUnique({
            where: { userId: session.user.id },
        });

        const result = await updateHousekeepingTaskStatus(taskId, status, notes, photos, checklistResults);

        // Log staff activity
        if (staffProfile) {
            await logStaffActivity({
                staffId: staffProfile.id,
                action: status === 'COMPLETED' ? 'TASK_COMPLETE' : status === 'IN_PROGRESS' ? 'TASK_START' : 'STATUS_CHANGE',
                entityType: 'task',
                entityId: taskId,
                oldValue: { status: task.status },
                newValue: { status },
                notes: notes || `Task ${status.toLowerCase()}`,
                propertyId: task.room.propertyId,
            });
        }

        // Create audit log
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: status === 'COMPLETED' ? "HOUSEKEEPING_COMPLETED" : "HOUSEKEEPING_STATUS_UPDATED",
                entity: "housekeepingTask",
                entityId: taskId,
                metadata: {
                    roomId: task.roomId,
                    roomNumber: task.room.roomNumber,
                    previousStatus: task.status,
                    newStatus: status,
                    notes,
                },
            },
        });

        return ok(result);
    } catch (error) {
        console.error("Error updating housekeeping task status:", error);
        return serverError();
    }
}
