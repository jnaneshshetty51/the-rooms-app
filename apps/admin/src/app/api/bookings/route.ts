// apps/admin/src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { getPropertyIdFromSession } from "@the-rooms/api/middleware";
import { paginated } from "@the-rooms/api/response";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

// ── Zod Schemas for Validation ──────────────────────────────────────────────

const GetBookingsSchema = z.object({
  status: z.enum(['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'REFUNDED']).optional(),
  bookingSource: z.string().optional(),
  bookingType: z.enum(['DAILY', 'MONTHLY']).optional(),
  checkInFrom: z.string().datetime().optional(),
  checkInTo: z.string().datetime().optional(),
  roomId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);

    // Validate query parameters with Zod
    const validatedParams = GetBookingsSchema.parse({
      status: searchParams.get("status") ?? undefined,
      paymentStatus: searchParams.get("paymentStatus") ?? undefined,
      bookingSource: searchParams.get("bookingSource") ?? undefined,
      bookingType: searchParams.get("bookingType") ?? undefined,
      checkInFrom: searchParams.get("checkInFrom") ?? undefined,
      checkInTo: searchParams.get("checkInTo") ?? undefined,
      roomId: searchParams.get("roomId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      perPage: searchParams.get("perPage") ?? undefined,
    });

    const { status, paymentStatus, bookingSource, bookingType, checkInFrom, checkInTo, roomId, search, page, perPage } = validatedParams;

    // Get propertyId from session for filtering
    const propertyId = await getPropertyIdFromSession(session);
    const userRole = (session?.user as { role?: string }).role;

    const where: Record<string, unknown> = {};

    // SUPER_ADMIN sees all properties, others filter by propertyId
    if (userRole !== "SUPER_ADMIN") {
      if (propertyId) {
        where.propertyId = propertyId;
      } else {
        // User has no property access
        return paginated([], 0, page, perPage);
      }
    }

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (bookingSource) where.bookingSource = bookingSource;
    if (bookingType) where.bookingType = bookingType;
    if (roomId) where.roomId = roomId;
    if (checkInFrom || checkInTo) {
      where.checkIn = {};
      if (checkInFrom) (where.checkIn as Record<string, unknown>).gte = new Date(checkInFrom);
      if (checkInTo) (where.checkIn as Record<string, unknown>).lte = new Date(checkInTo);
    }
    if (search) {
      where.OR = [
        { bookingNumber: { contains: search, mode: "insensitive" } },
        { guest: { name: { contains: search, mode: "insensitive" } } },
        { guest: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where,
        include: {
          guest: { select: { id: true, name: true, phone: true, email: true } },
          room: { select: { id: true, roomNumber: true, type: true } },
          payments: { select: { id: true, amount: true, status: true, method: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.booking.count({ where }),
    ]);

    return paginated(bookings, total, page, perPage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[BOOKINGS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
