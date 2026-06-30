import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

// ─── GET /api/housekeeping/tasks ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    }
    if (status && status !== "ALL") where.status = status;

    const rawTasks = await db.housekeepingTask.findMany({
      where,
      include: {
        room: { select: { roomNumber: true, type: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const tasks = rawTasks.map((t) => ({
      id: t.id,
      roomId: t.roomId,
      room: { roomNumber: t.room.roomNumber, type: t.room.type },
      type: "CLEANING" as const,
      status: t.status,
      priority: "MEDIUM" as const,
      assignedTo: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : null,
      dueAt: t.date.toISOString(),
      completedAt: null,
      notes: t.notes,
    }));

    return ok({ tasks, total: tasks.length });
  } catch (error) {
    console.error("Error fetching housekeeping tasks:", error);
    return serverError("Failed to fetch housekeeping tasks", "INTERNAL_ERROR");
  }
}

// ─── POST /api/housekeeping/tasks ─────────────────────────────────────────────

const CreateSchema = z.object({
  roomId: z.string().min(1),
  assigneeId: z.string().min(1),
  date: z.string(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors.map((e) => e.message).join(", "));
    }

    const task = await db.housekeepingTask.create({
      data: {
        roomId: parsed.data.roomId,
        assigneeId: parsed.data.assigneeId,
        date: new Date(parsed.data.date),
        notes: parsed.data.notes,
        status: "PENDING",
      },
      include: {
        room: { select: { roomNumber: true, type: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    return ok({ task });
  } catch (error) {
    console.error("Error creating housekeeping task:", error);
    return serverError("Failed to create housekeeping task", "INTERNAL_ERROR");
  }
}
