import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, notFound, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["REPORTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  resolution: z.string().optional(),
  actualCost: z.number().optional(),
});

// ─── PATCH /api/maintenance/[id] ──────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors.map((e) => e.message).join(", "));
    }

    const existing = await db.roomMaintenance.findUnique({ where: { id } });
    if (!existing) return notFound("Maintenance record not found");

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }
    if (parsed.data.status === "IN_PROGRESS" && !existing.startedAt) {
      updateData.startedAt = new Date();
    }

    const record = await db.roomMaintenance.update({
      where: { id },
      data: updateData,
      include: {
        room: { select: { roomNumber: true, type: true } },
      },
    });

    return ok({ record });
  } catch (error) {
    console.error("Error updating maintenance record:", error);
    return serverError("Failed to update maintenance record", "INTERNAL_ERROR");
  }
}

// ─── GET /api/maintenance/[id] ────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    const record = await db.roomMaintenance.findUnique({
      where: { id },
      include: {
        room: { select: { roomNumber: true, type: true } },
      },
    });

    if (!record) return notFound("Maintenance record not found");
    return ok({ record });
  } catch (error) {
    console.error("Error fetching maintenance record:", error);
    return serverError("Failed to fetch maintenance record", "INTERNAL_ERROR");
  }
}
