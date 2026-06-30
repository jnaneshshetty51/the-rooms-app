import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

// ─── GET /api/maintenance ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const roomId = searchParams.get("roomId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;
    if (priority && priority !== "ALL") where.priority = priority;
    if (roomId) where.roomId = roomId;
    if (fromDate || toDate) {
      where.reportedAt = {
        ...(fromDate ? { gte: new Date(fromDate) } : {}),
        ...(toDate ? { lte: new Date(toDate + "T23:59:59Z") } : {}),
      };
    }

    const rawRecords = await db.roomMaintenance.findMany({
      where,
      include: {
        room: { select: { roomNumber: true, type: true } },
      },
      orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
    });

    const records = rawRecords.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      room: { roomNumber: r.room.roomNumber, type: r.room.type },
      type: r.type as string,
      priority: r.priority as string,
      status: r.status as string,
      description: r.issue,
      reportedAt: r.reportedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      reportedBy: null,
    }));

    return ok({ records, total: records.length });
  } catch (error) {
    console.error("Error fetching maintenance records:", error);
    return serverError("Failed to fetch maintenance records", "INTERNAL_ERROR");
  }
}

// ─── POST /api/maintenance ────────────────────────────────────────────────────

const CreateSchema = z.object({
  roomId: z.string().min(1),
  type: z.enum(["PLUMBING", "ELECTRICAL", "FURNITURE", "HVAC", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  issue: z.string().min(1),
  description: z.string().optional(),
  scheduledDate: z.string().optional(),
  estimatedCost: z.number().optional(),
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

    const record = await db.roomMaintenance.create({
      data: {
        roomId: parsed.data.roomId,
        type: parsed.data.type,
        priority: parsed.data.priority,
        issue: parsed.data.issue,
        description: parsed.data.description,
        scheduledDate: parsed.data.scheduledDate ? new Date(parsed.data.scheduledDate) : undefined,
        estimatedCost: parsed.data.estimatedCost,
        createdById: (session.user as { id: string }).id,
      },
      include: {
        room: { select: { roomNumber: true, type: true } },
      },
    });

    return ok({ record });
  } catch (error) {
    console.error("Error creating maintenance record:", error);
    return serverError("Failed to create maintenance record", "INTERNAL_ERROR");
  }
}
