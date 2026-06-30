import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { approveDamageCharge } from "@the-rooms/db";
import { ok, notFound, unauthorized, serverError } from "@the-rooms/api/response";

// ─── POST /api/damage-assessments/[id]/approve ───────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    const result = await approveDamageCharge(id, { approvedById: userId });
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message.includes("not found")) return notFound("Damage assessment not found");
    console.error("Error approving damage assessment:", error);
    return serverError("Failed to approve damage charge", "INTERNAL_ERROR");
  }
}
