import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { Prisma, getBookings, generateBookingNumber } from "@the-rooms/db";
import { verifyPropertyAccess, getPropertyIdFromSession } from "@the-rooms/api/middleware";
import { paginated, created, badRequest, serverError } from "@the-rooms/api/response";
import { z } from "zod";

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const bookingQuerySchema = z.object({
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  bookingSource: z.string().optional(),
  checkInFrom: z.string().datetime().optional(),
  checkInTo: z.string().datetime().optional(),
  propertyId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
});

const createBookingSchema = z.object({
  guestId: z.string().min(1, "Guest ID is required"),
  roomId: z.string().min(1, "Room ID is required"),
  checkIn: z.string().datetime({ message: "Valid check-in date is required" }),
  checkOut: z.string().datetime({ message: "Valid check-out date is required" }),
  guestsCount: z.number().int().positive().default(1),
  bookingType: z.enum(["DAILY", "MONTHLY"]).default("DAILY"),
  bookingSource: z.enum(["WEBSITE", "WALK_IN", "PHONE", "OTA", "COMPLIMENTARY", "CORPORATE", "GROUP"]).default("WALK_IN"),
  specialRequests: z.string().optional(),
  baseAmount: z.number().positive("Base amount must be positive"),
  discountAmount: z.number().nonnegative().default(0),
  extrasAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().positive("Total amount is required"),
  complimentaryReason: z.string().optional(),
  docs: z.array(z.object({
    docType: z.string(),
    frontId: z.string().optional(),
    backId: z.string().optional(),
  })).optional().default([]),
  propertyId: z.string().optional(),
  discountCode: z.string().optional(),
});

// GET /api/bookings
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate query params
    const queryResult = bookingQuerySchema.safeParse({
      status: request.nextUrl.searchParams.get("status"),
      paymentStatus: request.nextUrl.searchParams.get("paymentStatus"),
      bookingSource: request.nextUrl.searchParams.get("bookingSource"),
      checkInFrom: request.nextUrl.searchParams.get("checkInFrom"),
      checkInTo: request.nextUrl.searchParams.get("checkInTo"),
      propertyId: request.nextUrl.searchParams.get("propertyId"),
      page: request.nextUrl.searchParams.get("page"),
      perPage: request.nextUrl.searchParams.get("perPage"),
    });

    if (!queryResult.success) {
      return badRequest(queryResult.error.errors.map(e => e.message).join(", "));
    }

    const {
      status,
      paymentStatus,
      bookingSource,
      checkInFrom,
      checkInTo,
      propertyId: queryPropertyId,
      page,
      perPage,
    } = queryResult.data;

    // Get propertyId from session for filtering
    const sessionPropertyId = await getPropertyIdFromSession(session);
    const userRole = session?.user?.role;

    // Determine the propertyId to use for filtering
    let propertyId: string | undefined;

    if (userRole === 'SUPER_ADMIN') {
      // SUPER_ADMIN can query across all properties or specific one
      propertyId = queryPropertyId;
    } else {
      // Other roles can only query their assigned property
      propertyId = sessionPropertyId || undefined;

      // If user tries to query a different property, deny access
      if (queryPropertyId && queryPropertyId !== sessionPropertyId) {
        const hasAccess = await verifyPropertyAccess(
          session.user.id,
          queryPropertyId,
          userRole || ''
        );
        if (!hasAccess) {
          return NextResponse.json({ error: "Access denied to this property" }, { status: 403 });
        }
        propertyId = queryPropertyId;
      }
    }

    if (!propertyId && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "No property access found" }, { status: 403 });
    }

    const where: Record<string, unknown> = {};

    // Add propertyId filter for non-SUPER_ADMIN users
    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (bookingSource) where.bookingSource = bookingSource;
    if (checkInFrom || checkInTo) {
      where.checkIn = {};
      if (checkInFrom) (where.checkIn as Record<string, unknown>).gte = new Date(checkInFrom);
      if (checkInTo) (where.checkIn as Record<string, unknown>).lte = new Date(checkInTo);
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

    // Get propertyId from session for default
    const sessionPropertyId = await getPropertyIdFromSession(session);
    const userRole = session?.user?.role;

    const body = await request.json();

    // Validate request body
    const bodyResult = createBookingSchema.safeParse(body);
    if (!bodyResult.success) {
      return badRequest(bodyResult.error.errors.map(e => e.message).join(", "));
    }

    const {
      guestId,
      roomId,
      checkIn,
      checkOut,
      guestsCount,
      bookingType,
      bookingSource,
      specialRequests,
      baseAmount,
      discountAmount,
      extrasAmount,
      totalAmount,
      complimentaryReason,
      docs,
      propertyId: bodyPropertyId,
      discountCode,
    } = bodyResult.data;

    if (process.env.NODE_ENV !== 'production') {
      console.log("[BOOKING_CREATE] Parsed fields - guestId:", guestId, "roomId:", roomId, "bookingSource:", bookingSource);
    }

    if (!guestId || !roomId || !checkIn || !checkOut || !totalAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Determine propertyId to use
    let propertyId = bodyPropertyId || sessionPropertyId;

    // Property-based access control (C3 - IDOR prevention)
    if (userRole !== 'SUPER_ADMIN' && propertyId) {
      const hasAccess = await verifyPropertyAccess(
        session.user.id,
        propertyId,
        userRole || ''
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to this property" }, { status: 403 });
      }
    }

    if (!propertyId) {
      return NextResponse.json({ error: "No property access found" }, { status: 403 });
    }

    const bookingNumber = await generateBookingNumber();

    // H2: Use SERIALIZABLE transaction isolation to prevent race conditions
    const booking = await db.$transaction(async (tx) => {
      // Lock the room row to prevent concurrent bookings
      await tx.room.findUnique({
        where: { id: roomId },
        select: { id: true, propertyId: true },
      });

      // Check for overlapping bookings within transaction
      const overlapping = await tx.booking.findFirst({
        where: {
          roomId,
          propertyId,
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
          propertyId,
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
          createdById: (session.user as { id: string }).id,
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
          userId: (session.user as { id: string }).id,
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
            propertyId,
          },
        },
      });

      // Create guest documents (one per guest)
      if (Array.isArray(docs) && docs.length > 0) {
        const uploaderId = (session.user as { id: string }).id;
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
