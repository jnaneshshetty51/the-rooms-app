import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getPropertyIdFromSession } from "@the-rooms/api/middleware";
import prisma from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = await getPropertyIdFromSession(session);
    if (!propertyId) {
      return NextResponse.json({ error: "No property access found" }, { status: 403 });
    }

    // Parse date parameter (YYYY-MM-DD format), default to today
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Use UTC dates for date calculations to avoid timezone issues
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Parse the requested date or use today
    let selectedDate: Date;
    if (dateParam) {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateParam)) {
        return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
      }
      selectedDate = new Date(Date.UTC(
        parseInt(dateParam.substring(0, 4)),
        parseInt(dateParam.substring(5, 7)) - 1,
        parseInt(dateParam.substring(8, 10))
      ));
    } else {
      selectedDate = today;
    }

    // Calculate start and end of selected date in UTC
    const selectedDateStart = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate()));
    const selectedDateEnd = new Date(selectedDateStart);
    selectedDateEnd.setUTCDate(selectedDateEnd.getUTCDate() + 1);

    // Tomorrow for comparison
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Check if selected date is today
    const isToday = selectedDate.getUTCFullYear() === today.getUTCFullYear() &&
      selectedDate.getUTCMonth() === today.getUTCMonth() &&
      selectedDate.getUTCDate() === today.getUTCDate();

    const prismaAny = prisma as unknown as Record<string, { findMany: (args: unknown) => Promise<unknown> }>;
    const [rooms, rawTypeProfiles] = await Promise.all([
      prisma.room.findMany({
        where: { propertyId },
        include: {
          amenities: { include: { amenity: true } },
          bookings: {
            where: { status: { in: ["CONFIRMED", "CHECKED_IN"] }, propertyId },
            include: { guest: { select: { name: true, phone: true } } },
            orderBy: { checkIn: "asc" },
          },
        },
        orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
      }),
      prismaAny.roomTypeProfile.findMany({
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      }),
    ]);
    const typeProfiles = rawTypeProfiles as Array<{ type: string; images: { url: string }[] }>;

    const typeImageMap: Record<string, string> = {};
    for (const p of typeProfiles) {
      if (p.images[0]) typeImageMap[p.type] = p.images[0].url;
    }

    const boardData = rooms.map((room) => {
      // Find the booking that covers the selected date (if any)
      // A booking covers a date if: checkIn <= selectedDate < checkOut
      const activeBooking = room.bookings.find((booking) => {
        const bookingCheckIn = new Date(booking.checkIn);
        const bookingCheckOut = new Date(booking.checkOut);
        return bookingCheckIn <= selectedDateStart && bookingCheckOut > selectedDateStart;
      }) ?? null;

      const checkInDate = activeBooking ? new Date(activeBooking.checkIn) : null;
      const checkOutDate = activeBooking ? new Date(activeBooking.checkOut) : null;

      // Determine arriving/departing status
      // Arriving: checkIn == selectedDate AND status == CONFIRMED
      const isArriving = !!(
        activeBooking &&
        activeBooking.status === "CONFIRMED" &&
        checkInDate &&
        checkInDate.getUTCFullYear() === selectedDate.getUTCFullYear() &&
        checkInDate.getUTCMonth() === selectedDate.getUTCMonth() &&
        checkInDate.getUTCDate() === selectedDate.getUTCDate()
      );

      // Departing: checkOut == selectedDate
      const isDeparting = !!(
        activeBooking &&
        checkOutDate &&
        checkOutDate.getUTCFullYear() === selectedDate.getUTCFullYear() &&
        checkOutDate.getUTCMonth() === selectedDate.getUTCMonth() &&
        checkOutDate.getUTCDate() === selectedDate.getUTCDate()
      );

      // For today-specific calculations (backward compatibility)
      const arrivingToday = isToday
        ? !!(
          activeBooking &&
          activeBooking.status === "CONFIRMED" &&
          checkInDate &&
          checkInDate >= today &&
          checkInDate < tomorrow
        )
        : false;

      const departingToday = isToday
        ? !!(
          activeBooking &&
          checkOutDate &&
          checkOutDate >= today &&
          checkOutDate < tomorrow
        )
        : false;

      // Room status logic - keep as ternary for TypeScript type narrowing:
      // - CHECKED_IN booking that covers the date → OCCUPIED
      // - CONFIRMED booking arriving on selected date → BOOKED
      // - CONFIRMED booking covering the date but departing on selected date → VACANT
      // - CONFIRMED booking for future (arriving later) → VACANT
      // - CHECKED_IN but not covering date → VACANT
      // - Room is BLOCKED/MAINTENANCE → keep that status unless CHECKED_IN
      // - No active booking → VACANT
      type BoardRoomStatus = "VACANT" | "BOOKED" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED";
      const displayStatus: BoardRoomStatus = (() => {
        if (activeBooking?.status === "CHECKED_IN") {
          return "OCCUPIED";
        }
        if (activeBooking?.status === "CONFIRMED") {
          if (isArriving) return "BOOKED";
          if (isDeparting) return "VACANT";
          // Future reservation not arriving yet - treat as available
          return "VACANT";
        }
        // No active booking or room blocked/maintenance
        return room.status as BoardRoomStatus;
      })();

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        type: room.type,
        floor: room.floor,
        status: displayStatus,
        cleaningStatus: room.cleaningStatus,
        description: room.description,
        basePriceSingle: room.basePriceSingle,
        basePriceDouble: room.basePriceDouble,
        monthlyPriceSingle: room.monthlyPriceSingle,
        monthlyPriceDouble: room.monthlyPriceDouble,
        thumbnail: typeImageMap[room.type] ?? null,
        amenities: room.amenities.map((ra) => ra.amenity.name),
        currentBooking: activeBooking
          ? {
            id: activeBooking.id,
            bookingNumber: (activeBooking as { bookingNumber?: string }).bookingNumber ?? null,
            guestName: activeBooking.guest?.name ?? "Unknown",
            guestPhone: activeBooking.guest?.phone ?? null,
            checkIn: activeBooking.checkIn,
            checkOut: activeBooking.checkOut,
            status: activeBooking.status,
            arrivingToday: isArriving,
            departingToday: isDeparting,
          }
          : null,
      };
    });

    return NextResponse.json({
      rooms: boardData,
      totalRooms: rooms.length,
      vacant: boardData.filter((r) => r.status === "VACANT").length,
      booked: boardData.filter((r) => r.status === "BOOKED").length,
      occupied: boardData.filter((r) => r.status === "OCCUPIED").length,
      maintenance: boardData.filter((r) => r.status === "MAINTENANCE").length,
      blocked: boardData.filter((r) => r.status === "BLOCKED").length,
      arrivingToday: boardData.filter((r) => r.currentBooking?.arrivingToday).length,
      departingToday: boardData.filter((r) => r.currentBooking?.departingToday).length,
      selectedDate: selectedDateStart.toISOString().split('T')[0],
      isToday,
    });
  } catch (error) {
    console.error("[ROOMS_BOARD] Error:", error);
    return NextResponse.json({ error: "Failed to fetch room board" }, { status: 500 });
  }
}
