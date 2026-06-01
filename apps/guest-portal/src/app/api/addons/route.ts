// apps/guest-portal/src/app/api/addons/route.ts
// POST /api/addons — request an add-on service
import { auth } from "@the-rooms/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma, getBookingById, createAddonRequest, getGuestAddonRequests } from "@the-rooms/db";

async function getGuestIdFromSession(session: Awaited<ReturnType<typeof auth>>) {
  if (!session?.user?.email) return null;
  const guest = await prisma.guest.findFirst({
    where: { email: session.user.email },
  });
  return guest?.id;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guestId = await getGuestIdFromSession(session);
    if (!guestId) {
      return NextResponse.json({ addons: [] });
    }

    const addons = await getGuestAddonRequests(guestId);
    return NextResponse.json({ addons });
  } catch (error) {
    console.error("Error fetching addons:", error);
    return NextResponse.json(
      { error: "Failed to fetch addon requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, addonType, notes, quantity } = body;

    if (!bookingId || !addonType) {
      return NextResponse.json(
        { error: "bookingId and addonType are required" },
        { status: 400 }
      );
    }

    const validAddonTypes = [
      "laundry",
      "extra_towels",
      "breakfast",
      "late_checkout",
      "early_checkin",
      "extra_bed",
      "iron_board",
      "room_service",
    ];
    if (!validAddonTypes.includes(addonType)) {
      return NextResponse.json(
        { error: `Invalid addon type. Must be one of: ${validAddonTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const guestId = await getGuestIdFromSession(session);
    if (!guestId) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Verify booking belongs to this guest
    const booking = await getBookingById(bookingId);
    if (!booking || booking.guestId !== guestId) {
      return NextResponse.json(
        { error: "Booking not found or unauthorized" },
        { status: 403 }
      );
    }

    // Only allow add-on for upcoming or checked-in bookings
    if (!["CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Cannot request add-ons for this booking in its current status" },
        { status: 400 }
      );
    }

    const addon = await createAddonRequest({
      bookingId,
      addonType,
      notes,
      quantity,
    });

    // Log audit for FO notification
    await prisma.auditLog.create({
      data: {
        userId: guestId,
        bookingId,
        action: "ADDON_REQUEST",
        entity: "booking",
        entityId: bookingId,
        metadata: {
          addonType,
          notes: notes ?? "",
          quantity: quantity ?? 1,
        },
      },
    });

    return NextResponse.json({ addon, message: "Add-on request submitted" }, { status: 201 });
  } catch (error) {
    console.error("Error creating addon request:", error);
    return NextResponse.json(
      { error: "Failed to submit addon request" },
      { status: 500 }
    );
  }
}
