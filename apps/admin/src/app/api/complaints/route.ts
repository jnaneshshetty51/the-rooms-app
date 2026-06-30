import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

// ─── GET /api/complaints ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = 20;

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;

    const [complaints, total] = await Promise.all([
      db.complaint.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              guest: { select: { id: true, name: true, phone: true, email: true } },
              room: { select: { id: true, roomNumber: true } },
            },
          },
          escalations: {
            orderBy: { escalatedAt: "desc" },
            take: 1,
          },
        },
        orderBy: [{ isUrgent: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.complaint.count({ where }),
    ]);

    return ok({
      complaints,
      total,
      pages: Math.ceil(total / pageSize),
      page,
    });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return serverError("Failed to fetch complaints", "INTERNAL_ERROR");
  }
}

// ─── POST /api/complaints ─────────────────────────────────────────────────────

const CreateComplaintSchema = z.object({
  bookingId: z.string().min(1),
  subject: z.string().min(1),
  description: z.string().min(1),
  isUrgent: z.boolean().optional().default(false),
  imageUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const body = await request.json();
    const parsed = CreateComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors.map((e) => e.message).join(", "));
    }

    const complaint = await db.complaint.create({
      data: parsed.data,
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

    return ok({ complaint });
  } catch (error) {
    console.error("Error creating complaint:", error);
    return serverError("Failed to create complaint", "INTERNAL_ERROR");
  }
}
