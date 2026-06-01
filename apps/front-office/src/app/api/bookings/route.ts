import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { Prisma } from "@prisma/client";
import { getBookings, createBooking, generateBookingNumber } from "@the-rooms/db";
import { getAvailableRooms } from "@the-rooms/db";

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
    } = body;

    if (!guestId || !roomId || !checkIn || !checkOut || !totalAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const availableRooms = await getAvailableRooms(new Date(checkIn), new Date(checkOut));
    const isRoomAvailable = availableRooms.some((r) => r.id === roomId);
    
    if (!isRoomAvailable) {
      return NextResponse.json({ error: "Room is not available" }, { status: 400 });
    }

    const bookingNumber = await generateBookingNumber();

    const booking = await createBooking({
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
      createdById: (session.user as { id?: string }).id,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
