import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { getDamageAssessmentById, updateDamageAssessment, deleteDamageAssessment } from "@the-rooms/db";
import { ok, notFound, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

const UpdateSchema = z.object({
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  images: z.array(z.string()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    const assessment = await getDamageAssessmentById(id);
    if (!assessment) return notFound("Damage assessment not found");
    return ok({ assessment });
  } catch (error) {
    console.error("Error fetching damage assessment:", error);
    return serverError("Failed to fetch damage assessment", "INTERNAL_ERROR");
  }
}

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

    const assessment = await updateDamageAssessment(id, parsed.data);
    return ok({ assessment });
  } catch (error) {
    console.error("Error updating damage assessment:", error);
    return serverError("Failed to update damage assessment", "INTERNAL_ERROR");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    await deleteDamageAssessment(id);
    return ok({ deleted: true });
  } catch (error) {
    console.error("Error deleting damage assessment:", error);
    return serverError("Failed to delete damage assessment", "INTERNAL_ERROR");
  }
}
