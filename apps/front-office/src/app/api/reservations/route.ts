// apps/front-office/src/app/api/reservations/route.ts
// Quick Reservation API for creating bookings directly from Room Board
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getPropertyIdFromSession } from "@the-rooms/api/middleware";
import prisma, { Prisma } from "@the-rooms/db";
import { calculateBookingPrice } from "@the-rooms/db/pricing";
import { generateBookingNumber } from "@the-rooms/db";

// POST /api/reservations - Create a quick reservation from room board
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const propertyId = await getPropertyIdFromSession(session);
        if (!propertyId) {
            return NextResponse.json({ error: "No property access found" }, { status: 403 });
        }

        const body = await request.json();
        const {
            roomId,
            checkIn,
            checkOut,
            guestId,
            guest: guestData,
            guestsCount = 1,
            bookingSource = "FRONT_DESK",
            specialRequests,
            discountCode,
        } = body;

        // Validate required fields
        if (!roomId || !checkIn || !checkOut) {
            return NextResponse.json(
                { error: "Missing required fields: roomId, checkIn, checkOut" },
                { status: 400 }
            );
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(checkIn) || !dateRegex.test(checkOut)) {
            return NextResponse.json(
                { error: "Invalid date format. Use YYYY-MM-DD" },
                { status: 400 }
            );
        }

        // Validate checkIn < checkOut
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (checkInDate >= checkOutDate) {
            return NextResponse.json(
                { error: "Check-out date must be after check-in date" },
                { status: 400 }
            );
        }

        // Parse dates as UTC for proper comparison
        const checkInUtc = new Date(Date.UTC(
            checkInDate.getFullYear(),
            checkInDate.getMonth(),
            checkInDate.getDate()
        ));
        const checkOutUtc = new Date(Date.UTC(
            checkOutDate.getFullYear(),
            checkOutDate.getMonth(),
            checkOutDate.getDate()
        ));

        // Use SERIALIZABLE transaction isolation to prevent race conditions
        const booking = await prisma.$transaction(async (tx) => {
            // ─── Step 1: Verify room exists and belongs to property ────────────────────
            const room = await tx.room.findUnique({
                where: { id: roomId },
                select: { id: true, propertyId: true, status: true, type: true },
            });

            if (!room) {
                throw new Error("Room not found");
            }

            if (room.propertyId !== propertyId) {
                throw new Error("Room does not belong to this property");
            }

            // ─── Step 2: Verify room is not OUT_OF_ORDER or BLOCKED ──────────────────
            if (room.status === "MAINTENANCE" || room.status === "BLOCKED") {
                throw new Error(`Room is currently ${room.status.toLowerCase()}. Please select a different room.`);
            }

            // ─── Step 3: Check for overlapping bookings ───────────────────────────────
            const overlapping = await tx.booking.findFirst({
                where: {
                    roomId,
                    propertyId,
                    status: { in: ["CONFIRMED", "CHECKED_IN"] },
                    AND: [
                        { checkIn: { lt: checkOutUtc } },
                        { checkOut: { gt: checkInUtc } },
                    ],
                },
            });

            if (overlapping) {
                throw new Error("Room is not available for the selected dates. Please choose different dates or another room.");
            }

            // ─── Step 4: Resolve guest (use existing or create new) ───────────────────
            let resolvedGuestId = guestId;

            if (!resolvedGuestId && guestData) {
                // Check if guest already exists by email or phone
                const existingGuest = await tx.guest.findFirst({
                    where: {
                        OR: [
                            guestData.email ? { email: guestData.email } : {},
                            guestData.phone ? { phone: guestData.phone } : {},
                        ],
                    },
                });

                if (existingGuest) {
                    resolvedGuestId = existingGuest.id;
                } else {
                    // Create new guest
                    const newGuest = await tx.guest.create({
                        data: {
                            name: guestData.name,
                            email: guestData.email || null,
                            phone: guestData.phone || null,
                            stayCount: 1,
                        },
                    });
                    resolvedGuestId = newGuest.id;

                    // Create audit log for guest creation
                    await tx.auditLog.create({
                        data: {
                            userId: (session.user as { id: string }).id,
                            action: "GUEST_CREATED",
                            entity: "guest",
                            entityId: newGuest.id,
                            metadata: {
                                guestId: newGuest.id,
                                name: guestData.name,
                                source: "quick_reservation",
                                propertyId,
                            },
                        },
                    });
                }
            }

            if (!resolvedGuestId) {
                throw new Error("Guest ID or guest information is required");
            }

            // ─── Step 5: Calculate pricing ─────────────────────────────────────────
            let pricing;
            try {
                pricing = await calculateBookingPrice(
                    roomId,
                    checkInUtc,
                    checkOutUtc,
                    guestsCount,
                    "DAILY",
                    discountCode
                );
            } catch (priceError) {
                console.error("[RESERVATION] Pricing error:", priceError);
                throw new Error("Failed to calculate pricing. Please try again.");
            }

            // ─── Step 6: Generate booking number ─────────────────────────────────────
            const bookingNumber = await generateBookingNumber();

            // ─── Step 7: Create the booking ───────────────────────────────────────────
            const newBooking = await tx.booking.create({
                data: {
                    bookingNumber,
                    guestId: resolvedGuestId,
                    roomId,
                    propertyId,
                    checkIn: checkInUtc,
                    checkOut: checkOutUtc,
                    guestsCount,
                    bookingType: pricing.bookingType,
                    bookingSource,
                    specialRequests: specialRequests || null,
                    baseAmount: pricing.baseAmount,
                    discountAmount: pricing.discountAmount,
                    extrasAmount: pricing.extrasAmount,
                    totalAmount: pricing.totalAmount,
                    paymentStatus: "PENDING",
                    discountCode: discountCode || null,
                    createdById: (session.user as { id: string }).id,
                },
            });

            // ─── Step 8: Increment discount code usage if applicable ────────────────
            if (discountCode) {
                const discount = await tx.discountCode.findUnique({
                    where: { code: discountCode.toUpperCase() },
                });
                if (discount) {
                    await tx.discountCode.update({
                        where: { id: discount.id },
                        data: { currentUses: { increment: 1 } },
                    });
                }
            }

            // ─── Step 9: Create audit log for booking creation ──────────────────────
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
                        totalAmount: pricing.totalAmount.toNumber(),
                        bookingSource,
                        propertyId,
                        source: "quick_reservation",
                    },
                },
            });

            return {
                booking: newBooking,
                pricing,
                guestId: resolvedGuestId,
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 10000,
        });

        // Fetch complete booking with relations for response
        const completeBooking = await prisma.booking.findUnique({
            where: { id: booking.booking.id },
            include: {
                guest: true,
                room: {
                    select: {
                        id: true,
                        roomNumber: true,
                        type: true,
                        floor: true,
                    },
                },
                createdBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return NextResponse.json({
            success: true,
            booking: completeBooking,
            pricing: {
                baseAmount: booking.pricing.baseAmount.toNumber(),
                discountAmount: booking.pricing.discountAmount.toNumber(),
                extrasAmount: booking.pricing.extrasAmount.toNumber(),
                subtotal: booking.pricing.subtotal.toNumber(),
                cgst: booking.pricing.cgst.toNumber(),
                sgst: booking.pricing.sgst.toNumber(),
                totalAmount: booking.pricing.totalAmount.toNumber(),
                nights: booking.pricing.nights,
                nightlyRate: booking.pricing.nightlyRate.toNumber(),
                bookingType: booking.pricing.bookingType,
                rateLabel: booking.pricing.rateLabel,
                extraGuestCharge: booking.pricing.extraGuestCharge.toNumber(),
                discountCode: booking.pricing.discountCode,
                discountType: booking.pricing.discountType,
                discountValue: booking.pricing.discountValue,
            },
        }, { status: 201 });

    } catch (error) {
        console.error("[RESERVATION] Error:", error);
        const message = error instanceof Error ? error.message : "Failed to create reservation";

        // Return 400 for validation errors (like room not available), 500 for other errors
        const isValidationError =
            message.includes("not available") ||
            message.includes("Room") ||
            message.includes("not found") ||
            message.includes("must be after") ||
            message.includes("required");

        return NextResponse.json(
            { error: message },
            { status: isValidationError ? 400 : 500 }
        );
    }
}

// GET /api/reservations - Check availability for a room
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get("roomId");
        const checkIn = searchParams.get("checkIn");
        const checkOut = searchParams.get("checkOut");

        if (!roomId || !checkIn || !checkOut) {
            return NextResponse.json(
                { error: "Missing required parameters: roomId, checkIn, checkOut" },
                { status: 400 }
            );
        }

        const propertyId = await getPropertyIdFromSession(session);
        if (!propertyId) {
            return NextResponse.json({ error: "No property access found" }, { status: 403 });
        }

        // Parse dates
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const checkInUtc = new Date(Date.UTC(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate()));
        const checkOutUtc = new Date(Date.UTC(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate()));

        // Check room exists and status
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { id: true, roomNumber: true, status: true, propertyId: true },
        });

        if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        if (room.propertyId !== propertyId) {
            return NextResponse.json({ error: "Room does not belong to this property" }, { status: 403 });
        }

        // Check for overlapping bookings
        const overlapping = await prisma.booking.findFirst({
            where: {
                roomId,
                propertyId,
                status: { in: ["CONFIRMED", "CHECKED_IN"] },
                AND: [
                    { checkIn: { lt: checkOutUtc } },
                    { checkOut: { gt: checkInUtc } },
                ],
            },
        });

        const isAvailable = room.status !== "MAINTENANCE" &&
            room.status !== "BLOCKED" &&
            !overlapping;

        return NextResponse.json({
            roomId,
            roomNumber: room.roomNumber,
            checkIn,
            checkOut,
            isAvailable,
            reason: !isAvailable
                ? overlapping
                    ? "Room is already booked for these dates"
                    : `Room is currently ${room.status.toLowerCase()}`
                : null,
            overlappingBooking: overlapping
                ? {
                    id: overlapping.id,
                    bookingNumber: overlapping.bookingNumber,
                    checkIn: overlapping.checkIn,
                    checkOut: overlapping.checkOut,
                }
                : null,
        });

    } catch (error) {
        console.error("[RESERVATION] GET Error:", error);
        return NextResponse.json({ error: "Failed to check availability" }, { status: 500 });
    }
}
