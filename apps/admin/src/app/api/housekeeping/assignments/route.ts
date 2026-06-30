import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

// ─── GET /api/housekeeping/assignments ────────────────────────────────────────
// Returns all tasks for a date, grouped as assignment list.

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    const where: Record<string, unknown> = {};
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    }

    const tasks = await db.housekeepingTask.findMany({
      where,
      include: {
        room: { select: { roomNumber: true, type: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const assignments = tasks.map((t) => ({
      taskId: t.id,
      roomId: t.roomId,
      room: { roomNumber: t.room.roomNumber, type: t.room.type },
      staffId: t.assigneeId,
      staff: { id: t.assignee.id, name: t.assignee.name },
      status: t.status,
      date: t.date.toISOString(),
    }));

    return ok({ assignments });
  } catch (error) {
    console.error("Error fetching housekeeping assignments:", error);
    return serverError("Failed to fetch assignments", "INTERNAL_ERROR");
  }
}

// ─── POST /api/housekeeping/assignments ───────────────────────────────────────
// Reassign a task to a different staff member.

const AssignSchema = z.object({
  taskId: z.string().min(1),
  staffId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const body = await request.json();
    const parsed = AssignSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors.map((e) => e.message).join(", "));
    }

    const task = await db.housekeepingTask.update({
      where: { id: parsed.data.taskId },
      data: { assigneeId: parsed.data.staffId },
      include: {
        room: { select: { roomNumber: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    return ok({ task });
  } catch (error) {
    console.error("Error assigning housekeeping task:", error);
    return serverError("Failed to assign task", "INTERNAL_ERROR");
  }
}
