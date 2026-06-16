import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { z } from "zod";
import { assignHousekeepingStaff, getPendingHousekeepingTasks } from "@the-rooms/db/queries/staffQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// Schema for creating assignment
const createAssignmentSchema = z.object({
    roomId: z.string(),
    staffId: z.string(),
    date: z.string().transform(s => new Date(s)),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    notes: z.string().optional(),
    propertyId: z.string().optional(),
});

// GET /api/housekeeping/assignments
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");
        const staffId = searchParams.get("staffId");
        const propertyId = searchParams.get("propertyId") || "default";

        if (!dateParam) {
            return badRequest("Date is required");
        }

        const date = new Date(dateParam);

        // Get pending tasks for the date
        const tasks = await getPendingHousekeepingTasks(date, propertyId);

        // If staffId is provided, filter by staff
        const filteredTasks = staffId
            ? tasks.filter(t => t.assigneeId === staffId)
            : tasks;

        return ok({ tasks: filteredTasks });
    } catch (error) {
        console.error("Error fetching housekeeping assignments:", error);
        return serverError();
    }
}

// POST /api/housekeeping/assignments
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Role check - only ADMIN, FRONT_OFFICE, HOUSEKEEPING can assign
        const userRole = session.user.role;
        if (!['ADMIN', 'FRONT_OFFICE', 'HOUSEKEEPING', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to assign housekeeping tasks");
        }

        const body = await request.json();
        const parsed = createAssignmentSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0]?.message || "Invalid input");
        }

        const { roomId, staffId, date, priority, notes, propertyId } = parsed.data;

        // Verify room exists
        const room = await db.room.findUnique({ where: { id: roomId } });
        if (!room) {
            return badRequest("Room not found");
        }

        // Verify staff exists and has HOUSEKEEPING role or is a valid staff member
        const staffProfile = await db.staffProfile.findUnique({
            where: { id: staffId },
            include: { user: true },
        });

        if (!staffProfile) {
            return badRequest("Staff member not found");
        }

        const result = await assignHousekeepingStaff(roomId, staffId, date, priority || 'MEDIUM', {
            notes,
            propertyId,
        });

        // Create audit log
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "HOUSEKEEPING_ASSIGNED",
                entity: "housekeepingTask",
                entityId: result.task.id,
                metadata: {
                    roomId,
                    roomNumber: room.roomNumber,
                    staffId,
                    staffName: staffProfile.user?.name,
                    priority: priority || 'MEDIUM',
                    date: date.toISOString(),
                },
            },
        });

        return created(result);
    } catch (error) {
        console.error("Error creating housekeeping assignment:", error);
        return serverError();
    }
}
