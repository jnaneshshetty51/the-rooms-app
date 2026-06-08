import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { Prisma, getBookings, generateBookingNumber } from "@the-rooms/db";

// GET /api/bookings
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const paymentStatus = searchParams.get("paymentStatus") ?? undefined;
    const bookingSource = searchParams.get("bookingSource") ?? undefined;
    const checkInFrom = searchParams.get("checkInFrom");
    const checkInTo = searchParams.get("checkInTo");
    const page = parseInt(searchParams.get("page") ?? "1");
    const perPage = parseInt(searchParams.get("perPage") ?? "20");

    const filters = {
      status,
      paymentStatus,
      bookingSource,
      checkInFrom: checkInFrom ? new Date(checkInFrom) : undefined,
      checkInTo: checkInTo ? new Date(checkInTo) : undefined,
      page,
      perPage,
    };

    const result = await getBookings(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

// POST /api/bookings
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      guestId,
      roomId,
      checkIn,
      checkOut,
      guestsCount = 1,
      bookingType = "DAILY",
      bookingSource = "WALK_IN",
      specialRequests,
      baseAmount,
      discountAmount = 0,
      extrasAmount = 0,
      totalAmount,
      complimentaryReason,
    } = body;

    if (!guestId || !roomId || !checkIn || !checkOut || !totalAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bookingNumber = await generateBookingNumber();

    // Use transaction to prevent race conditions
    const booking = await prisma.$transaction(async (tx) => {
      // Check for overlapping bookings within transaction (locks rows)
      const overlapping = await tx.booking.findFirst({
        where: {
          roomId,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          OR: [
            {
              checkIn: { lt: new Date(checkOut) },
              checkOut: { gt: new Date(checkIn) },
            },
          ],
        },
      });

      if (overlapping) {
        throw new Error("Room is not available for the selected dates");
      }

      // Create the booking
      const isComplimentary = bookingSource === "COMPLIMENTARY";
      const newBooking = await tx.booking.create({
        data: {
          bookingNumber,
          guestId,
          roomId,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          guestsCount,
          bookingType,
          bookingSource,
          specialRequests,
          baseAmount: new Prisma.Decimal(baseAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          extrasAmount: new Prisma.Decimal(extrasAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          paymentStatus: isComplimentary ? "PAID" : "PENDING", // Complimentary bookings are considered paid
          complimentaryReason: isComplimentary ? complimentaryReason : null,
          createdById: (session.user as { id?: string }).id,
        },
      });

      // Create audit log for booking creation
      await tx.auditLog.create({
        data: {
          userId: (session.user as { id?: string }).id,
          bookingId: newBooking.id,
          action: "BOOKING_CREATED",
          entity: "booking",
          entityId: newBooking.id,
          metadata: {
            bookingNumber,
            roomId,
            checkIn,
            checkOut,
            totalAmount,
            bookingSource,
          },
        },
      });

      return newBooking;
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Error creating booking:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors
      if (error.code === 'P2002') {
        return NextResponse.json({ error: "A booking with this number already exists" }, { status: 400 });
      }
    }
    const message = error instanceof Error ? error.message : "Failed to create booking";
    // Return 400 for validation errors (like room not available), 500 for other errors
    const isValidationError = message.includes("not available") || message.includes("Room") || message.includes("already exists");
    return NextResponse.json({ error: message }, { status: isValidationError ? 400 : 500 });
  }
}
