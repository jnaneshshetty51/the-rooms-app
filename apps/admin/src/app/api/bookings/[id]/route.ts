// apps/admin/src/app/api/bookings/[id]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, serverError, notFound } from "@the-rooms/api/response";
import { z } from "zod";
import { updateBookingWithLocking } from "@the-rooms/db/queries/bookingQueries";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const UpdateBookingStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]),
  version: z.number().int().positive(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const { id } = await params;
    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        room: { include: { photos: true, amenities: { include: { amenity: true } } } },
        payments: true,
        invoice: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) return notFound("Booking", "NOT_FOUND");
    return ok({ booking });
  } catch (error) {
    console.error("[BOOKING_GET]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateBookingStatusSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        "VALIDATION_ERROR"
      );
    }

    const { status, version } = parsed.data;

    const updateData: Record<string, unknown> = { status };
    if (status === "CHECKED_IN") updateData.checkInTime = new Date();
    if (status === "CHECKED_OUT") updateData.checkOutTime = new Date();

    // Use optimistic locking for update
    const booking = await updateBookingWithLocking(id, updateData, version);

    // Auto-update room status
    if (status === "CHECKED_IN") {
      await db.room.update({ where: { id: booking.roomId }, data: { status: "OCCUPIED" } });
    } else if (status === "CHECKED_OUT" || status === "CANCELLED") {
      await db.room.update({ where: { id: booking.roomId }, data: { status: "VACANT" } });
    }

    return ok({ booking, version: booking.version });
  } catch (error) {
    console.error("[BOOKING_PATCH]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}
