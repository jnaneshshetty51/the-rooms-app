// apps/front-office/src/app/api/bookings/reservation/route.ts
// Advance Booking with Partial Payment API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db } from '@the-rooms/db';
import { Prisma } from '@the-rooms/db';
import { ok, created, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import { z } from 'zod';

// ─── Request Schema ───────────────────────────────────────────────────────────

const ReservationBookingSchema = z.object({
    guest: z.object({
        id: z.string().optional(), // Existing guest ID
        name: z.string().min(1, 'Guest name is required'),
        phone: z.string().min(10, 'Valid phone number is required'),
        email: z.string().email().optional(),
        address: z.string().optional(),
    }),
    roomType: z.enum(['STUDIO', 'PREMIUM']),
    checkIn: z.string().datetime({ message: 'Invalid check-in date' }),
    checkOut: z.string().datetime({ message: 'Invalid check-out date' }),
    guestsCount: z.number().int().min(1).default(1),
    bookingType: z.enum(['DAILY', 'MONTHLY']).default('DAILY'),
    paymentType: z.enum(['FULL', 'PARTIAL']).default('PARTIAL'),
    partialAmount: z.number().optional(), // Custom partial amount
    depositPercent: z.number().min(0).max(100).default(20), // Default 20% deposit
    discountCode: z.string().optional(),
    specialRequests: z.string().optional(),
    corporateAccountId: z.string().optional(), // For corporate billing
    propertyId: z.string().default('default'),
});

// ─── GET Reservations ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const checkInFrom = searchParams.get('checkInFrom');
        const checkInTo = searchParams.get('checkInTo');

        const where: Prisma.BookingWhereInput = {
            bookingSource: { in: ['WEBSITE', 'PHONE', 'CORPORATE'] },
        };

        if (status) {
            where.status = status as Prisma.EnumBookingStatusFilter;
        }

        if (checkInFrom || checkInTo) {
            where.checkIn = {};
            if (checkInFrom) where.checkIn.gte = new Date(checkInFrom);
            if (checkInTo) where.checkIn.lte = new Date(checkInTo);
        }

        const reservations = await db.booking.findMany({
            where,
            include: {
                guest: true,
                room: true,
                advanceDeposit: true,
            },
            orderBy: { checkIn: 'asc' },
            take: 50,
        });

        return ok({ reservations });
    } catch (error) {
        console.error('[RESERVATIONS_GET]', error);
        return serverError('Internal server error', 'INTERNAL_ERROR');
    }
}

// ─── POST Create Reservation ───────────────────────────────────────────────────

/**
 * POST /api/bookings/reservation
 * Create an advance booking with partial payment support
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only FRONT_OFFICE, ADMIN, and SUPER_ADMIN can create reservations
        if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const data = ReservationBookingSchema.parse(body);

        const checkInDate = new Date(data.checkIn);
        const checkOutDate = new Date(data.checkOut);

        // Validate check-out is after check-in
        if (checkOutDate <= checkInDate) {
            return badRequest('Check-out must be after check-in', 'INVALID_DATES');
        }

        // Validate check-in is in the future (advance booking)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (checkInDate < today) {
            return badRequest('Check-in date must be in the future for reservations', 'INVALID_CHECKIN');
        }

        const userId = (session.user as { id: string }).id;

        // ─── Transaction: Create Advance Reservation ─────────────────────────
        const booking = await db.$transaction(async (tx) => {
            // 1. Find or create guest
            let guest;

            if (data.guest.id) {
                guest = await tx.guest.findUnique({
                    where: { id: data.guest.id },
                });
            } else {
                guest = await tx.guest.findFirst({
                    where: { phone: data.guest.phone },
                });
            }

            if (!guest) {
                guest = await tx.guest.create({
                    data: {
                        name: data.guest.name,
                        phone: data.guest.phone,
                        email: data.guest.email,
                        address: data.guest.address,
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
                throw new Error('GUEST_BLACKLISTED');
            }

            // 3. For corporate bookings, validate corporate account
            if (data.corporateAccountId) {
                const corporateAccount = await tx.corporateAccount.findUnique({
                    where: { id: data.corporateAccountId },
                });

                if (!corporateAccount || !corporateAccount.isActive) {
                    throw new Error('INVALID_CORPORATE_ACCOUNT');
                }
            }

            // 4. Find available room
            const availableRooms = await tx.room.findMany({
                where: {
                    type: data.roomType,
                    status: 'VACANT',
                    propertyId: data.propertyId,
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
                    { floor: 'asc' },
                    { roomNumber: 'asc' },
                ],
                take: 10,
            });

            if (availableRooms.length === 0) {
                throw new Error('NO_ROOM_AVAILABLE');
            }

            const selectedRoom = availableRooms[0];

            // 5. Calculate pricing
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

            // Apply discount if provided
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

            // Apply corporate discount if applicable
            let corporateDiscountAmount = 0;
            if (data.corporateAccountId) {
                const corporateAccount = await tx.corporateAccount.findUnique({
                    where: { id: data.corporateAccountId },
                });

                if (corporateAccount?.discountPercent) {
                    const totalBeforeDiscount = (basePrice * nights) - discountAmount;
                    corporateDiscountAmount = (totalBeforeDiscount * corporateAccount.discountPercent.toNumber()) / 100;
                }
            }

            const totalAmount = Math.max(0, (basePrice * nights) - discountAmount - corporateDiscountAmount);

            // 6. Calculate deposit amount
            let depositAmount = 0;
            let balanceAmount = totalAmount;
            let paymentStatus: Prisma.BookingUpdateInput['paymentStatus'] = 'PENDING';

            if (data.corporateAccountId) {
                // Corporate bookings don't require immediate payment
                depositAmount = 0;
                balanceAmount = totalAmount;
                paymentStatus = 'PENDING'; // Will be billed to corporate
            } else if (data.paymentType === 'FULL') {
                depositAmount = totalAmount;
                balanceAmount = 0;
                paymentStatus = 'PAID';
            } else {
                // PARTIAL payment (default 20%)
                const depositPercent = data.partialAmount
                    ? (data.partialAmount / totalAmount) * 100
                    : data.depositPercent;

                depositAmount = Math.ceil(totalAmount * (depositPercent / 100));
                balanceAmount = totalAmount - depositAmount;
                paymentStatus = 'PARTIAL';
            }

            // 7. Generate booking number
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

            // 8. Create booking with HOLD status initially
            const newBooking = await tx.booking.create({
                data: {
                    bookingNumber,
                    guestId: guest.id,
                    roomId: selectedRoom.id,
                    propertyId: data.propertyId,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    guestsCount: data.guestsCount,
                    bookingType: data.bookingType,
                    bookingSource: data.corporateAccountId ? 'CORPORATE' : 'WEBSITE',
                    status: 'HOLD', // Initial status for advance reservation
                    paymentStatus,
                    baseAmount: new Prisma.Decimal(basePrice),
                    discountAmount: new Prisma.Decimal(discountAmount + corporateDiscountAmount),
                    totalAmount: new Prisma.Decimal(totalAmount),
                    discountCode: data.discountCode?.toUpperCase() || null,
                    discountType,
                    specialRequests: data.specialRequests,
                    corporateAccountId: data.corporateAccountId || null,
                    roomAssignmentType: 'AUTO_ASSIGN', // Auto-assign at check-in for advance bookings
                    createdById: userId,
                },
            });

            // 9. Create room hold (expires 4 hours before check-in)
            const holdExpiresAt = new Date(checkInDate.getTime() - 4 * 60 * 60 * 1000);

            await tx.roomHold.create({
                data: {
                    roomId: selectedRoom.id,
                    holdType: 'BOOKING',
                    bookingId: newBooking.id,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    expiresAt: holdExpiresAt,
                    status: 'ACTIVE',
                },
            });

            // 10. Create booking room assignment
            await tx.bookingRoomAssignment.create({
                data: {
                    bookingId: newBooking.id,
                    assignmentType: 'AUTO_ASSIGN',
                    autoAssignedRoomId: selectedRoom.id,
                    autoAssignedAt: new Date(),
                    finalRoomId: selectedRoom.id,
                },
            });

            // 11. Create payment for deposit if paid
            if (depositAmount > 0) {
                const payment = await tx.payment.create({
                    data: {
                        bookingId: newBooking.id,
                        amount: new Prisma.Decimal(depositAmount),
                        method: 'ONLINE', // Default for advance bookings
                        status: 'PAID',
                    },
                });

                // Create advance deposit record
                await tx.advanceDeposit.create({
                    data: {
                        bookingId: newBooking.id,
                        amount: new Prisma.Decimal(depositAmount),
                        paymentId: payment.id,
                        status: 'HELD',
                    },
                });

                // Update booking status to CONFIRMED after deposit received
                if (paymentStatus === 'PAID') {
                    await tx.booking.update({
                        where: { id: newBooking.id },
                        data: { status: 'CONFIRMED' },
                    });
                }
            }

            // 12. Create audit log
            await tx.auditLog.create({
                data: {
                    userId,
                    bookingId: newBooking.id,
                    action: 'RESERVATION_CREATED',
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
                        depositAmount,
                        balanceAmount,
                        paymentType: data.paymentType,
                        corporateAccountId: data.corporateAccountId,
                        propertyId: data.propertyId,
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
                    corporateDiscountAmount,
                    totalAmount,
                    depositAmount,
                    balanceAmount,
                    paymentStatus,
                },
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 15000,
        });

        return created(booking, { page: 1, pageSize: 1, total: 1 });
    } catch (error) {
        console.error('[RESERVATION_BOOKING_ERROR]', error);

        if (error instanceof z.ZodError) {
            return badRequest(
                error.errors.map(e => e.message).join(', '),
                'VALIDATION_ERROR'
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to create reservation';

        if (message === 'NO_ROOM_AVAILABLE') {
            return badRequest('No rooms available for the selected dates', 'NO_ROOM_AVAILABLE');
        }

        if (message === 'GUEST_BLACKLISTED') {
            return badRequest('This guest is blacklisted', 'GUEST_BLACKLISTED');
        }

        if (message === 'INVALID_CORPORATE_ACCOUNT') {
            return badRequest('Invalid or inactive corporate account', 'INVALID_CORPORATE_ACCOUNT');
        }

        return serverError(message, 'INTERNAL_ERROR');
    }
}
