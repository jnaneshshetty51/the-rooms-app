import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, unauthorized, serverError } from "@the-rooms/api/response";

// ─── GET /api/housekeeping/tasks/progress ─────────────────────────────────────
// Returns per-staff progress stats for a given date.

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
      include: { assignee: { select: { id: true, name: true } } },
    });

    const staffMap = new Map<string, { staffId: string; staffName: string; totalTasks: number; completedTasks: number; inProgressTasks: number }>();

    for (const task of tasks) {
      const key = task.assigneeId;
      if (!staffMap.has(key)) {
        staffMap.set(key, {
          staffId: task.assigneeId,
          staffName: task.assignee.name ?? "Unknown",
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
        });
      }
      const entry = staffMap.get(key)!;
      entry.totalTasks += 1;
      if (task.status === "COMPLETED") entry.completedTasks += 1;
      if (task.status === "IN_PROGRESS") entry.inProgressTasks += 1;
    }

    return ok({ progress: Array.from(staffMap.values()) });
  } catch (error) {
    console.error("Error fetching housekeeping progress:", error);
    return serverError("Failed to fetch housekeeping progress", "INTERNAL_ERROR");
  }
}
