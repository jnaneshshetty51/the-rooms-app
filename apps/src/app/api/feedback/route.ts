// apps/guest-portal/src/app/api/feedback/route.ts
// GET /api/feedback — fetch guest feedback/reviews
// POST /api/feedback — submit a post-stay review
import { auth } from "@the-rooms/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma, getBookingById } from "@the-rooms/db";

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
      return NextResponse.json({ reviews: [] });
    }

    // Get all reviews for this guest's bookings
    const reviews = await prisma.auditLog.findMany({
      where: {
        booking: { guestId },
        action: "REVIEW",
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            checkIn: true,
            checkOut: true,
            room: { select: { roomNumber: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
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
    const { bookingId, rating, reviewText, isAnonymous } = body;

    if (!bookingId || !rating) {
      return NextResponse.json(
        { error: "bookingId and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
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

    // Only allow review for checked-out bookings
    if (booking.status !== "CHECKED_OUT") {
      return NextResponse.json(
        { error: "You can only review completed stays" },
        { status: 400 }
      );
    }

    // Check if review already exists
    const existing = await prisma.auditLog.findFirst({
      where: { bookingId, action: "REVIEW" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A review has already been submitted for this booking" },
        { status: 409 }
      );
    }

    // Store review as audit log
    const review = await prisma.auditLog.create({
      data: {
        userId: guestId,
        bookingId,
        action: "REVIEW",
        entity: "review",
        entityId: bookingId,
        metadata: {
          rating,
          reviewText: reviewText ?? "",
          isAnonymous: isAnonymous ?? false,
          status: "PENDING_APPROVAL",
          submittedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      review,
      message: "Thank you for your review! It will be published after approval.",
    }, { status: 201 });
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}
