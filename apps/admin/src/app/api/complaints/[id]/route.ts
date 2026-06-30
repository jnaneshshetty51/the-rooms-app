import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, notFound, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

const UpdateComplaintSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  resolution: z.string().optional(),
  isUrgent: z.boolean().optional(),
});

// ─── PATCH /api/complaints/[id] ───────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors.map((e) => e.message).join(", "));
    }

    const existing = await db.complaint.findUnique({ where: { id } });
    if (!existing) return notFound("Complaint not found");

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED") {
      updateData.resolvedAt = new Date();
    }

    const complaint = await db.complaint.update({
      where: { id },
      data: updateData,
      include: {
        booking: {
          select: {
            bookingNumber: true,
            guest: { select: { name: true } },
            room: { select: { roomNumber: true } },
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: (session.user as { id: string }).id,
        action: "UPDATE",
        entity: "complaint",
        entityId: id,
        metadata: parsed.data,
      },
    });

    return ok({ complaint });
  } catch (error) {
    console.error("Error updating complaint:", error);
    return serverError("Failed to update complaint", "INTERNAL_ERROR");
  }
}

// ─── GET /api/complaints/[id] ─────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    const complaint = await db.complaint.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            bookingNumber: true,
            guest: { select: { name: true, phone: true, email: true } },
            room: { select: { roomNumber: true } },
          },
        },
        escalations: { orderBy: { escalatedAt: "asc" } },
      },
    });

    if (!complaint) return notFound("Complaint not found");
    return ok({ complaint });
  } catch (error) {
    console.error("Error fetching complaint:", error);
    return serverError("Failed to fetch complaint", "INTERNAL_ERROR");
  }
}
