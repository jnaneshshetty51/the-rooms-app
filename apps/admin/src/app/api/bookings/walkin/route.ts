// apps/admin/src/app/api/bookings/walkin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";
import { z } from "zod";
import { createAuditLog, getPropertyIdFromSession } from "@the-rooms/api/middleware";
import { created } from "@the-rooms/api/response";

// ─── Request Schema ───────────────────────────────────────────────────────────

const WalkinBookingSchema = z.object({
    guest: z.object({
        name: z.string().min(1, "Guest name is required"),
        phone: z.string().min(10, "Valid phone number is required"),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
    }),
    roomType: z.enum(["STUDIO", "PREMIUM"]),
    checkIn: z.string().datetime({ message: "Invalid check-in date" }),
    checkOut: z.string().datetime({ message: "Invalid check-out date" }),
    guestsCount: z.number().int().min(1).default(1),
    bookingType: z.enum(["DAILY", "MONTHLY"]).default("DAILY"),
    paymentMethod: z.enum(["CASH", "UPI", "CARD", "ONLINE"]).default("CASH"),
    paymentAmount: z.number().optional(),
    discountCode: z.string().optional(),
    specialRequests: z.string().optional(),
    assignmentType: z.enum(["PRE_ASSIGNED", "AUTO_ASSIGN"]).default("PRE_ASSIGNED"),
    preAssignedRoomId: z.string().optional(),
});

// ─── Walk-in Booking ──────────────────────────────────────────────────────────

/**
 * POST /api/bookings/walkin
 * Create a walk-in booking with instant room allocation (Admin)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only ADMIN and SUPER_ADMIN can create walk-in bookings
        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const data = WalkinBookingSchema.parse(body);

        const checkInDate = new Date(data.checkIn);
        const checkOutDate = new Date(data.checkOut);

        // Validate check-out is after check-in
        if (checkOutDate <= checkInDate) {
            return NextResponse.json(
                { error: "Check-out must be after check-in" },
                { status: 400 }
            );
        }

        const userId = (session.user as { id: string }).id;
        const propertyId = await getPropertyIdFromSession(session) || "default";

        // ─── Transaction: Create Walk-in Booking ─────────────────────────────────
        const booking = await db.$transaction(async (tx) => {
            // 1. Find or create guest
            let guest = await tx.guest.findFirst({
                where: { phone: data.guest.phone },
            });

            if (!guest) {
                guest = await tx.guest.create({
                    data: {
                        name: data.guest.name,
                        phone: data.guest.phone,
                        email: data.guest.email || null,
                        address: data.guest.address || null,
                    },
                });
            } else {
                // Update guest info if provided
                guest = await tx.guest.update({
                    where: { id: guest.id },
                    data: {
                        name: data.guest.name,
                        email: data.guest.email || guest.email,
                        address: data.guest.address || guest.address,
                    },
                });
            }

            // 2. Check for blacklisted guest
            if (guest.isBlacklisted) {
                throw new Error("GUEST_BLACKLISTED");
            }

            // 3. Find available room
            let selectedRoom = null;

            if (data.preAssignedRoomId) {
                // Check if pre-assigned room is available
                const preRoom = await tx.room.findUnique({
                    where: { id: data.preAssignedRoomId },
                });

                if (preRoom && preRoom.type === data.roomType && preRoom.status === 'VACANT') {
                    // Check for conflicting bookings
                    const conflict = await tx.booking.findFirst({
                        where: {
                            roomId: data.preAssignedRoomId,
                            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                            OR: [
                                { checkIn: { lt: checkOutDate }, checkOut: { gt: checkInDate } },
                            ],
                        },
                    });

                    if (!conflict) {
                        selectedRoom = preRoom;
                    }
                }
            }

            if (!selectedRoom) {
                // Find best available room
                const availableRooms = await tx.room.findMany({
                    where: {
                        type: data.roomType,
                        status: 'VACANT',
                        cleaningStatus: 'CLEAN',
                        propertyId: propertyId,
                        bookings: {
                            none: {
                                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                                AND: [
                                    { checkIn: { lt: checkOutDate } },
                                    { checkOut: { gt: checkInDate } },
                                ],
                            },
                        },
                    },
                    orderBy: [
                        { floor: 'asc' }, // Lower floors for walk-ins
                        { roomNumber: 'asc' },
                    ],
                    take: 10,
                });

                if (availableRooms.length > 0) {
                    selectedRoom = availableRooms[0];
                }
            }

            if (!selectedRoom) {
                throw new Error("NO_ROOM_AVAILABLE");
            }

            // 4. Calculate pricing
            const nights = Math.ceil(
                (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // For MONTHLY bookings with ≥28 nights, use monthly rate
            const isMonthly = data.bookingType === 'MONTHLY' ||
                (data.bookingType === 'DAILY' && nights >= 28 && data.roomType === 'STUDIO');

            let basePrice: number;
            if (isMonthly) {
                basePrice = data.roomType === 'STUDIO'
                    ? selectedRoom.monthlyPriceSingle?.toNumber() || selectedRoom.basePriceSingle.toNumber()
                    : selectedRoom.monthlyPriceDouble?.toNumber() || selectedRoom.basePriceDouble.toNumber();
            } else {
                basePrice = data.guestsCount > 1
                    ? selectedRoom.basePriceDouble.toNumber()
                    : selectedRoom.basePriceSingle.toNumber();
            }

            let discountAmount = 0;
            let discountType: string | null = null;

            // Validate and apply discount if provided
            if (data.discountCode) {
                const discount = await tx.discountCode.findUnique({
                    where: { code: data.discountCode.toUpperCase() },
                });

                if (discount && discount.isActive) {
                    const now = new Date();
                    const validFrom = discount.validFrom?.getTime() ?? 0;
                    const validUntil = discount.validUntil?.getTime() ?? Infinity;

                    if (now.getTime() >= validFrom && now.getTime() <= validUntil) {
                        if (discount.maxUses === null || discount.currentUses < discount.maxUses) {
                            if (nights >= discount.minNights && (!discount.maxNights || nights <= discount.maxNights)) {
                                if (discount.type === 'PERCENTAGE') {
                                    discountAmount = (basePrice * nights * discount.value.toNumber()) / 100;
                                    discountType = 'PERCENTAGE';
                                } else {
                                    discountAmount = discount.value.toNumber();
                                    discountType = 'FIXED_AMOUNT';
                                }

                                // Increment usage
                                await tx.discountCode.update({
                                    where: { id: discount.id },
                                    data: { currentUses: { increment: 1 } },
                                });
                            }
                        }
                    }
                }
            }

            const totalAmount = Math.max(0, (basePrice * nights) - discountAmount);

            // 5. Generate booking number
            const today = new Date();
            const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
            const prefix = `BKN-${dateStr}-`;

            const lastBooking = await tx.booking.findFirst({
                where: { bookingNumber: { startsWith: prefix } },
                orderBy: { bookingNumber: 'desc' },
                select: { bookingNumber: true },
            });

            let counter = 1;
            if (lastBooking) {
                const lastCounter = parseInt(lastBooking.bookingNumber.split('-').pop() ?? '0', 10);
                counter = lastCounter + 1;
            }

            const bookingNumber = `${prefix}${String(counter).padStart(4, '0')}`;

            // 6. Create booking
            const newBooking = await tx.booking.create({
                data: {
                    bookingNumber,
                    guestId: guest.id,
                    roomId: selectedRoom.id,
                    propertyId: propertyId,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    guestsCount: data.guestsCount,
                    bookingType: data.bookingType,
                    bookingSource: 'WALK_IN',
                    status: 'CONFIRMED',
                    paymentStatus: data.paymentAmount ? (data.paymentAmount >= totalAmount ? 'PAID' : 'PARTIAL') : 'PENDING',
                    baseAmount: new Prisma.Decimal(basePrice),
                    discountAmount: new Prisma.Decimal(discountAmount),
                    totalAmount: new Prisma.Decimal(totalAmount),
                    discountCode: data.discountCode?.toUpperCase() || null,
                    discountType,
                    specialRequests: data.specialRequests,
                    roomAssignmentType: data.assignmentType as any,
                    createdById: userId,
                },
            });

            // 7. Create room hold
            const holdExpiresAt = data.assignmentType === 'PRE_ASSIGNED'
                ? checkOutDate // Hold until check-out for walk-ins
                : new Date(checkInDate.getTime() + 30 * 60 * 1000); // 30 min hold for auto-assign

            await tx.roomHold.create({
                data: {
                    roomId: selectedRoom.id,
                    holdType: data.assignmentType === 'PRE_ASSIGNED' ? 'PRE_ASSIGN' : 'BOOKING',
                    bookingId: newBooking.id,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    expiresAt: holdExpiresAt,
                    status: 'ACTIVE',
                },
            });

            // 8. Create booking room assignment
            await tx.bookingRoomAssignment.create({
                data: {
                    bookingId: newBooking.id,
                    assignmentType: data.assignmentType as any,
                    preAssignedRoomId: data.assignmentType === 'PRE_ASSIGNED' ? selectedRoom.id : null,
                    preAssignedAt: data.assignmentType === 'PRE_ASSIGNED' ? new Date() : null,
                    autoAssignedRoomId: data.assignmentType === 'AUTO_ASSIGN' ? selectedRoom.id : null,
                    autoAssignedAt: data.assignmentType === 'AUTO_ASSIGN' ? new Date() : null,
                    finalRoomId: selectedRoom.id,
                },
            });

            // 9. Create payment if amount provided
            if (data.paymentAmount && data.paymentAmount > 0) {
                await tx.payment.create({
                    data: {
                        bookingId: newBooking.id,
                        amount: new Prisma.Decimal(data.paymentAmount),
                        method: data.paymentMethod as any,
                        status: 'PAID',
                    },
                });
            }

            // 10. Create audit log
            await tx.auditLog.create({
                data: {
                    userId,
                    bookingId: newBooking.id,
                    action: 'WALKIN_BOOKING_CREATED',
                    entity: 'booking',
                    entityId: newBooking.id,
                    metadata: {
                        bookingNumber,
                        roomType: data.roomType,
                        roomId: selectedRoom.id,
                        roomNumber: selectedRoom.roomNumber,
                        checkIn: checkInDate.toISOString(),
                        checkOut: checkOutDate.toISOString(),
                        totalAmount,
                        assignmentType: data.assignmentType,
                        propertyId: propertyId,
                    },
                },
            });

            return {
                booking: newBooking,
                guest,
                room: selectedRoom,
                pricing: {
                    basePrice,
                    nights,
                    discountAmount,
                    totalAmount,
                    paidAmount: data.paymentAmount || 0,
                    balanceDue: totalAmount - (data.paymentAmount || 0),
                },
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 15000,
        });

        // Create audit log outside transaction
        await createAuditLog({
            userId,
            action: 'WALKIN_BOOKING_CREATED',
            entity: 'booking',
            entityId: booking.booking.id,
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            metadata: {
                bookingNumber: booking.booking.bookingNumber,
                roomNumber: booking.room.roomNumber,
            },
        });

        return NextResponse.json(booking, { status: 201 });
    } catch (error) {
        console.error("[WALKIN_BOOKING_ERROR]", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation error", details: error.errors },
                { status: 400 }
            );
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return NextResponse.json(
                    { error: "A booking with this number already exists" },
                    { status: 400 }
                );
            }
        }

        const message = error instanceof Error ? error.message : "Failed to create walk-in booking";

        if (message === "NO_ROOM_AVAILABLE") {
            return NextResponse.json(
                { error: "NO_ROOM_AVAILABLE", message: "No rooms available for the selected dates" },
                { status: 409 }
            );
        }

        if (message === "GUEST_BLACKLISTED") {
            return NextResponse.json(
                { error: "GUEST_BLACKLISTED", message: "This guest is blacklisted" },
                { status: 403 }
            );
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}