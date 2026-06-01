// apps/admin/src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const bookingSource = searchParams.get("bookingSource");
    const bookingType = searchParams.get("bookingType");
    const checkInFrom = searchParams.get("checkInFrom");
    const checkInTo = searchParams.get("checkInTo");
    const roomId = searchParams.get("roomId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") ?? "1");
    const perPage = parseInt(searchParams.get("perPage") ?? "20");

    const where: Record<string, unknown> = {};
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
      prisma.booking.findMany({
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
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({ bookings, total, pages: Math.ceil(total / perPage), page });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[BOOKINGS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
