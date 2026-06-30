import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { getAllDamageAssessments, createDamageAssessment } from "@the-rooms/db";
import { ok, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

// ─── GET /api/damage-assessments ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const damageType = searchParams.get("damageType") as "MINOR" | "MODERATE" | "SEVERE" | "TOTAL_LOSS" | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const result = await getAllDamageAssessments({
      page,
      pageSize: 20,
      ...(damageType ? { damageType } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    });

    return ok(result);
  } catch (error) {
    console.error("Error fetching damage assessments:", error);
    return serverError("Failed to fetch damage assessments", "INTERNAL_ERROR");
  }
}

// ─── POST /api/damage-assessments ────────────────────────────────────────────

const CreateSchema = z.object({
  bookingId: z.string().min(1),
  roomId: z.string().min(1),
  description: z.string().min(1),
  damageType: z.enum(["MINOR", "MODERATE", "SEVERE", "TOTAL_LOSS"]),
  amount: z.number().positive(),
  images: z.array(z.string()).optional().default([]),
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

    const assessment = await createDamageAssessment({
      ...parsed.data,
      assessedById: (session.user as { id: string }).id,
    });

    return ok({ assessment });
  } catch (error) {
    console.error("Error creating damage assessment:", error);
    return serverError("Failed to create damage assessment", "INTERNAL_ERROR");
  }
}
