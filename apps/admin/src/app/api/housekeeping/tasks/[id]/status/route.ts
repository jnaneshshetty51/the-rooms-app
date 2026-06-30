import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, notFound, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

const UpdateStatusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
});

// ─── PATCH /api/housekeeping/tasks/[id]/status ────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors.map((e) => e.message).join(", "));
    }

    const existing = await db.housekeepingTask.findUnique({ where: { id } });
    if (!existing) return notFound("Housekeeping task not found");

    const task = await db.housekeepingTask.update({
      where: { id },
      data: { status: parsed.data.status },
      include: {
        room: { select: { roomNumber: true, type: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    return ok({ task });
  } catch (error) {
    console.error("Error updating housekeeping task status:", error);
    return serverError("Failed to update task status", "INTERNAL_ERROR");
  }
}
