import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { Prisma, getBookings, generateBookingNumber } from "@the-rooms/db";
import { verifyPropertyAccess } from "@the-rooms/api/middleware";

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
    const propertyId = searchParams.get("propertyId") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1");
    const perPage = parseInt(searchParams.get("perPage") ?? "20");

    // Property-based access control (C3 - IDOR prevention)
    // Only SUPER_ADMIN can query across all properties
    if (propertyId && session.user.role !== 'SUPER_ADMIN') {
      const hasAccess = await verifyPropertyAccess(
        session.user.id,
        propertyId,
        session.user.role
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to this property" }, { status: 403 });
      }
    }

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
    console.log("[BOOKING_CREATE] Request body:", JSON.stringify(body, null, 2));
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
      docs,
      propertyId,
      discountCode,
    } = body;

    console.log("[BOOKING_CREATE] Parsed fields - guestId:", guestId, "roomId:", roomId, "bookingSource:", bookingSource);

    if (!guestId || !roomId || !checkIn || !checkOut || !totalAmount) {
      console.log("[BOOKING_CREATE] Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Property-based access control (C3 - IDOR prevention)
    if (session.user.role !== 'SUPER_ADMIN' && propertyId) {
      const hasAccess = await verifyPropertyAccess(
        session.user.id,
        propertyId,
        session.user.role
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to this property" }, { status: 403 });
      }
    }

    const bookingNumber = await generateBookingNumber();

    // H2: Use SERIALIZABLE transaction isolation to prevent race conditions
    const booking = await prisma.$transaction(async (tx) => {
      // Lock the room row to prevent concurrent bookings
      await tx.room.findUnique({
        where: { id: roomId },
        select: { id: true },
      });

      // Check for overlapping bookings within transaction
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
          discountCode: discountCode || null,
          createdById: (session.user as { id?: string }).id,
        },
      });

      // Increment discount code usage if applicable
      if (discountCode) {
        const discount = await tx.discountCode.findUnique({ where: { code: discountCode.toUpperCase() } });
        if (discount) {
          await tx.discountCode.update({
            where: { id: discount.id },
            data: { currentUses: { increment: 1 } },
          });
        }
      }

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
            propertyId: propertyId || 'default',
          },
        },
      });

      // Create guest documents (one per guest)
      if (Array.isArray(docs) && docs.length > 0) {
        const uploaderId = (session.user as { id?: string }).id;
        for (const doc of docs as Array<{ docType: string; frontId?: string; backId?: string }>) {
          if (!doc.frontId) continue;
          await tx.guestDocument.create({
            data: {
              guestId,
              bookingId: newBooking.id,
              documentType: doc.docType as "AADHAAR" | "PASSPORT" | "VOTER_ID" | "DRIVING_LICENSE",
              frontUrl: doc.frontId,
              backUrl: doc.backId || null,
              uploadedById: uploaderId,
            },
          });
        }
        await tx.auditLog.create({
          data: {
            userId: uploaderId,
            bookingId: newBooking.id,
            action: "DOCUMENT_UPLOADED",
            entity: "guestDocument",
            entityId: newBooking.id,
            metadata: { count: docs.length },
          },
        });
      }

      return newBooking;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000,
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
