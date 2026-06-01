// apps/guest-portal/src/app/api/complaints/route.ts
// GET /api/complaints — fetch guest complaints
// POST /api/complaints — create a complaint
import { auth } from "@the-rooms/auth";
import { NextRequest, NextResponse } from "next/server";
import { db, getGuestComplaints, createComplaint, getComplaintByBooking, getBookingById } from "@the-rooms/db";

async function getGuestIdFromSession(session: Awaited<ReturnType<typeof auth>>) {
  if (!session?.user?.email) return null;
  const guest = await db.guest.findFirst({
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
      return NextResponse.json({ complaints: [] });
    }

    const complaints = await getGuestComplaints(guestId);
    return NextResponse.json({ complaints });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return NextResponse.json(
      { error: "Failed to fetch complaints" },
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
    const { bookingId, subject, description, isUrgent, imageUrl } = body;

    if (!bookingId || !subject || !description) {
      return NextResponse.json(
        { error: "bookingId, subject, and description are required" },
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

    // Check if complaint already exists for this booking
    const existing = await getComplaintByBooking(bookingId);
    if (existing) {
      return NextResponse.json(
        { error: "A complaint already exists for this booking" },
        { status: 409 }
      );
    }

    const complaint = await createComplaint({
      bookingId,
      subject,
      description,
      isUrgent,
      imageUrl,
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: guestId,
        bookingId,
        action: "CREATE",
        entity: "complaint",
        entityId: complaint.id,
        metadata: { subject, isUrgent },
      },
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    console.error("Error creating complaint:", error);
    return NextResponse.json(
      { error: "Failed to create complaint" },
      { status: 500 }
    );
  }
}
