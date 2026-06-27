import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { postRoomCharges } from "@the-rooms/db";
import { created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { createAuditLog, getClientIp, verifyPropertyAccess } from "@the-rooms/api/middleware";

// ─── POST /api/night-audit/post-charges ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const userRole = session.user.role as string;
    if (userRole === "GUEST" || userRole === "FRONT_OFFICE") {
      return forbidden("Access denied - insufficient permissions");
    }

    const body = await request.json();
    const { date, propertyId = "default" } = body;

    if (!date) return badRequest("Date is required");

    if (userRole !== "SUPER_ADMIN") {
      const hasAccess = await verifyPropertyAccess(session.user.id, propertyId, userRole);
      if (!hasAccess) return forbidden("Access denied to this property");
    }

    const chargeDate = new Date(date);
    chargeDate.setHours(0, 0, 0, 0);

    const results = await postRoomCharges(propertyId, chargeDate, session.user.id);

    const created_count = results.filter((r) => r.status === "CREATED").length;

    await createAuditLog({
      userId: session.user.id,
      action: "ROOM_CHARGES_POSTED",
      entity: "nightAudit",
      entityId: propertyId,
      metadata: {
        date: chargeDate.toISOString().split("T")[0],
        propertyId,
        bookingsCharged: created_count,
      },
      ipAddress: getClientIp(request),
    });

    return created({
      date: chargeDate.toISOString().split("T")[0],
      chargesPosted: created_count,
      totalBookings: results.length,
      results,
    });
  } catch (error) {
    console.error("Error posting room charges:", error);
    return serverError("Failed to post room charges");
  }
}
