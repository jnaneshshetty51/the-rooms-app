/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ROOMS - High-Risk Scenario Validators
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Validators for edge cases that can cause data corruption, financial loss,
 * or operational failures. These should be called by API routes before
 * performing critical operations.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import prisma from './index';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type ValidationResult = {
    safe: boolean;
    errors: string[];
    warnings: string[];
};

export type DoubleBookingCheckParams = {
    roomId: string;
    checkIn: Date;
    checkOut: Date;
    excludeBookingId?: string;
};

export type DuplicatePaymentCheckParams = {
    transactionId: string;
    amount: number;
    bookingId: string;
};

export type NightAuditChainCheckParams = {
    propertyId: string;
    date: Date;
};

// ─── High-Risk Validators ─────────────────────────────────────────────────────

/**
 * 1. DOUBLE BOOKING PREVENTION
 *
 * Checks if a room is already booked for overlapping dates.
 * Uses serializable isolation to prevent race conditions.
 *
 * This is the MOST CRITICAL validator - double bookings cause:
 * - Guest displacement
 * - Revenue loss
 * - Reputation damage
 */
export async function validateNoDoubleBooking(
    params: DoubleBookingCheckParams
): Promise<ValidationResult> {
    const { roomId, checkIn, checkOut, excludeBookingId } = params;

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Use serializable transaction to lock rows
        const conflicting = await prisma.$transaction(
            async (tx) => {
                // First, lock the room
                const room = await tx.room.findUnique({
                    where: { id: roomId },
                    select: { id: true, roomNumber: true, status: true },
                });

                if (!room) {
                    throw new Error(`Room not found: ${roomId}`);
                }

                // Check for overlapping bookings
                const whereClause: Prisma.BookingWhereInput = {
                    roomId,
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                    checkIn: { lt: checkOut },
                    checkOut: { gt: checkIn },
                };

                if (excludeBookingId) {
                    whereClause.id = { not: excludeBookingId };
                }

                const bookings = await tx.booking.findMany({
                    where: whereClause,
                    select: {
                        id: true,
                        bookingNumber: true,
                        checkIn: true,
                        checkOut: true,
                        status: true,
                        guest: { select: { name: true } },
                    },
                });

                return { room, bookings };
            },
            {
                isolationLevel: 'Serializable',
                timeout: 10000,
            }
        );

        if (conflicting.bookings.length > 0) {
            const conflict = conflicting.bookings[0];
            errors.push(
                `Room ${conflicting.room.roomNumber} is already booked for ${formatDateRange(
                    conflict.checkIn,
                    conflict.checkOut
                )} (${conflict.status})`
            );

            if (conflict.status === 'CHECKED_IN') {
                errors.push(
                    `CRITICAL: Guest ${conflict.guest.name} is currently checked into this room`
                );
            }
        }

        return {
            safe: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        return {
            safe: false,
            errors: [`Double booking check failed: ${(error as Error).message}`],
            warnings: [],
        };
    }
}

/**
 * 2. DUPLICATE CHECK-IN PREVENTION
 *
 * Checks if a guest is already checked into a room.
 * Prevents the same guest from being checked in twice.
 */
export async function validateNoDuplicateCheckin(
    bookingId: string
): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                status: true,
                checkInTime: true,
                guest: { select: { id: true, name: true } },
                room: { select: { id: true, roomNumber: true } },
            },
        });

        if (!booking) {
            return {
                safe: false,
                errors: ['Booking not found'],
                warnings: [],
            };
        }

        if (booking.status === 'CHECKED_IN') {
            errors.push(
                `Guest ${booking.guest.name} is already checked into Room ${booking.room.roomNumber} since ${formatDateTime(
                    booking.checkInTime
                )}`
            );
        }

        // Also check if this guest has another active booking
        const otherActiveBookings = await prisma.booking.findFirst({
            where: {
                guestId: booking.guest.id,
                id: { not: bookingId },
                status: 'CHECKED_IN',
            },
            select: {
                id: true,
                bookingNumber: true,
                room: { select: { roomNumber: true } },
            },
        });

        if (otherActiveBookings) {
            errors.push(
                `Guest ${booking.guest.name} has another active booking ${otherActiveBookings.bookingNumber} in Room ${otherActiveBookings.room.roomNumber}`
            );
        }

        return {
            safe: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        return {
            safe: false,
            errors: [`Duplicate check-in check failed: ${(error as Error).message}`],
            warnings: [],
        };
    }
}

/**
 * 3. PAYMENT IDEMPOTENCY CHECK
 *
 * Checks if a payment with the same transaction ID already exists.
 * Prevents duplicate charges on gateway timeout/retry.
 */
export async function validatePaymentIdempotency(
    params: DuplicatePaymentCheckParams
): Promise<ValidationResult> {
    const { transactionId, amount, bookingId } = params;

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Check for existing payment with same transaction ID
        const existingPayment = await prisma.payment.findUnique({
            where: { transactionId },
            select: {
                id: true,
                status: true,
                amount: true,
                bookingId: true,
            },
        });

        if (existingPayment) {
            if (existingPayment.bookingId !== bookingId) {
                errors.push(
                    `Transaction ${transactionId} was used for a different booking`
                );
            }

            if (existingPayment.status === 'PAID') {
                errors.push(
                    `Payment of ₹${existingPayment.amount} already processed for this transaction`
                );
            }

            if (existingPayment.status === 'FAILED') {
                warnings.push(
                    `Previous attempt failed - you can retry with same transaction ID`
                );
            }
        }

        // Also check for duplicate booking payments
        const bookingPayments = await prisma.payment.findMany({
            where: { bookingId },
            select: {
                id: true,
                transactionId: true,
                amount: true,
                status: true,
            },
        });

        const sameAmountPayments = bookingPayments.filter(
            (p) => p.amount.toNumber() === amount && p.status === 'PAID'
        );

        if (sameAmountPayments.length > 0) {
            errors.push(
                `A payment of ₹${amount} has already been processed for this booking`
            );
        }

        return {
            safe: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        return {
            safe: false,
            errors: [`Payment idempotency check failed: ${(error as Error).message}`],
            warnings: [],
        };
    }
}

/**
 * 4. ROOM AVAILABILITY CONSISTENCY CHECK
 *
 * Verifies that a room marked as unavailable doesn't have an active booking.
 * Prevents "room sold but unavailable" scenario.
 */
export async function validateRoomAvailabilityConsistency(
    roomId: string
): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: {
                id: true,
                roomNumber: true,
                status: true,
                bookings: {
                    where: {
                        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                        checkIn: { lte: new Date() },
                        checkOut: { gte: new Date() },
                    },
                    select: {
                        id: true,
                        bookingNumber: true,
                        status: true,
                        checkIn: true,
                        checkOut: true,
                    },
                },
            },
        });

        if (!room) {
            return {
                safe: false,
                errors: ['Room not found'],
                warnings: [],
            };
        }

        // If room is OCCUPIED, it should have a CHECKED_IN booking
        if (room.status === 'OCCUPIED') {
            const checkedInBooking = room.bookings.find((b) => b.status === 'CHECKED_IN');
            if (!checkedInBooking) {
                errors.push(
                    `Room ${room.roomNumber} is marked OCCUPIED but has no checked-in booking`
                );
            }
        }

        // If room is VACANT, it should not have any active bookings
        if (room.status === 'VACANT' && room.bookings.length > 0) {
            const conflict = room.bookings[0];
            errors.push(
                `Room ${room.roomNumber} is VACANT but has active booking ${conflict.bookingNumber} (${conflict.status})`
            );
        }

        // If room is MAINTENANCE, warn about any active bookings
        if (room.status === 'MAINTENANCE' && room.bookings.length > 0) {
            const conflict = room.bookings[0];
            warnings.push(
                `Room ${room.roomNumber} is in MAINTENANCE but has booking ${conflict.bookingNumber} - guest may need relocation`
            );
        }

        return {
            safe: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        return {
            safe: false,
            errors: [
                `Room availability consistency check failed: ${(error as Error).message}`,
            ],
            warnings: [],
        };
    }
}

/**
 * 5. NIGHT AUDIT CHAIN VALIDATION
 *
 * Ensures the previous day's night audit was completed before
 * starting a new one. Prevents "night audit skipped" scenario.
 */
export async function validateNightAuditChain(
    params: NightAuditChainCheckParams
): Promise<ValidationResult> {
    const { propertyId, date } = params;

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        // Check if this date is already closed
        const dailyClose = await prisma.propertyDailyClose.findUnique({
            where: {
                propertyId_closeDate: {
                    propertyId,
                    closeDate: targetDate,
                },
            },
            select: {
                id: true,
                closedAt: true,
                totalCheckIns: true,
                totalCheckOuts: true,
                totalOccupied: true,
                totalRevenue: true,
            },
        });

        if (dailyClose) {
            errors.push(
                `Night audit already completed for ${formatDate(targetDate)} at ${formatDateTime(
                    dailyClose.closedAt
                )}`
            );
            return {
                safe: false,
                errors,
                warnings,
            };
        }

        // Check if previous day was closed
        const previousDate = new Date(targetDate);
        previousDate.setDate(previousDate.getDate() - 1);

        const previousClose = await prisma.propertyDailyClose.findUnique({
            where: {
                propertyId_closeDate: {
                    propertyId,
                    closeDate: previousDate,
                },
            },
            select: {
                id: true,
                closeDate: true,
                closedAt: true,
            },
        });

        if (!previousClose) {
            errors.push(
                `Previous day (${formatDate(previousDate)}) night audit not completed - must close previous day first`
            );
        }

        return {
            safe: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        return {
            safe: false,
            errors: [`Night audit chain check failed: ${(error as Error).message}`],
            warnings: [],
        };
    }
}

/**
 * 6. BLACKLISTED GUEST CHECK
 *
 * Checks if a guest is blacklisted before allowing booking.
 */
export async function validateGuestNotBlacklisted(
    guestId: string
): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Check GuestBlacklist table
        const blacklistEntry = await prisma.guestBlacklist.findUnique({
            where: { guestId },
            select: {
                id: true,
                reason: true,
                description: true,
                expiresAt: true,
            },
        });

        if (blacklistEntry) {
            // Check if expired
            if (blacklistEntry.expiresAt && blacklistEntry.expiresAt < new Date()) {
                // Blacklist expired, no error
                warnings.push('Previous blacklist entry has expired');
            } else {
                errors.push(
                    `Guest is blacklisted: ${blacklistEntry.reason}${blacklistEntry.description ? ` - ${blacklistEntry.description}` : ''
                    }`
                );
            }
        }

        // Also check quick flag on guest
        const guest = await prisma.guest.findUnique({
            where: { id: guestId },
            select: { id: true, name: true, isBlacklisted: true, blacklistReason: true },
        });

        if (guest?.isBlacklisted) {
            errors.push(
                `Guest ${guest.name} is flagged as blacklisted${guest.blacklistReason ? `: ${guest.blacklistReason}` : ''
                }`
            );
        }

        return {
            safe: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        return {
            safe: false,
            errors: [`Blacklist check failed: ${(error as Error).message}`],
            warnings: [],
        };
    }
}

/**
 * 7. PAYMENT AMOUNT VALIDATION
 *
 * Validates payment amount against booking total.
 * Prevents underpayment or overpayment issues.
 */
export async function validatePaymentAmount(
    bookingId: string,
    paymentAmount: number
): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                totalAmount: true,
                paymentStatus: true,
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                    },
                },
            },
        });

        if (!booking) {
            return {
                safe: false,
                errors: ['Booking not found'],
                warnings: [],
            };
        }

        const totalAmount = booking.totalAmount.toNumber();
        const paidAmount = booking.payments
            .filter((p) => p.status === 'PAID')
            .reduce((sum, p) => sum + p.amount.toNumber(), 0);

        const remainingAmount = totalAmount - paidAmount;

        if (paymentAmount < 0) {
            errors.push('Payment amount cannot be negative');
        }

        if (paymentAmount > totalAmount) {
            warnings.push(
                `Payment amount ₹${paymentAmount} exceeds booking total ₹${totalAmount} - overpayment will be refunded`
            );
        }

        if (paymentAmount < remainingAmount && paymentAmount > 0) {
            warnings.push(
                `Partial payment ₹${paymentAmount} - remaining balance ₹${remainingAmount}`
            );
        }

        return {
            safe: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        return {
            safe: false,
            errors: [`Payment amount validation failed: ${(error as Error).message}`],
            warnings: [],
        };
    }
}

/**
 * 8. ROOM READY FOR CHECK-IN VALIDATION
 *
 * Ensures room is ready (clean, vacant) before check-in.
 */
export async function validateRoomReadyForCheckin(
    roomId: string
): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: {
                id: true,
                roomNumber: true,
                status: true,
                cleaningStatus: true,
                cleaningNotes: true,
                lastCleanedAt: true,
            },
        });

        if (!room) {
            return {
                safe: false,
                errors: ['Room not found'],
                warnings: [],
            };
        }

        if (room.status !== 'VACANT') {
            errors.push(
                `Room ${room.roomNumber} is not vacant (status: ${room.status})`
            );
        }

        if (room.cleaningStatus === 'DIRTY') {
            errors.push(`Room ${room.roomNumber} is dirty and must be cleaned`);
        }

        if (room.cleaningStatus === 'CLEANING') {
            warnings.push(
                `Room ${room.roomNumber} is currently being cleaned - verify before proceeding`
            );
        }

        // Warn if not cleaned recently (within last 24 hours)
        if (room.lastCleanedAt) {
            const hoursSinceCleaned =
                (Date.now() - room.lastCleanedAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceCleaned > 24) {
                warnings.push(
                    `Room ${room.roomNumber} was last cleaned ${Math.floor(
                        hoursSinceCleaned
                    )} hours ago`
                );
            }
        }

        return {
            safe: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        return {
            safe: false,
            errors: [`Room ready check failed: ${(error as Error).message}`],
            warnings: [],
        };
    }
}

/**
 * 9. CANCELLATION WINDOW VALIDATION
 *
 * Checks if cancellation is allowed based on policy.
 */
export async function validateCancellationAllowed(
    bookingId: string
): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                checkIn: true,
                status: true,
                totalAmount: true,
                paymentStatus: true,
                property: {
                    select: {
                        id: true,
                        settings: {
                            select: {
                                cancellationPolicy: true,
                                cancellationPolicyHours: true,
                            },
                        },
                    },
                },
            },
        });

        if (!booking) {
            return {
                safe: false,
                errors: ['Booking not found'],
                warnings: [],
            };
        }

        if (booking.status !== 'CONFIRMED') {
            errors.push(
                `Cannot cancel booking with status ${booking.status} - only CONFIRMED bookings can be cancelled`
            );
        }

        const now = new Date();
        const checkIn = new Date(booking.checkIn);
        const hoursUntilCheckIn =
            (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

        const policyHours =
            booking.property.settings?.cancellationPolicyHours ?? 24;

        if (hoursUntilCheckIn < 0) {
            errors.push('Check-in time has passed - cannot cancel');
        } else if (hoursUntilCheckIn < policyHours) {
            warnings.push(
                `Within ${policyHours}h cancellation window - penalty may apply per policy`
            );
        }

        // Check if payment was made
        if (
            booking.paymentStatus === 'PAID' ||
            booking.paymentStatus === 'PARTIAL'
        ) {
            warnings.push('Payment was made - refund processing will be required');
        }

        return {
            safe: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        return {
            safe: false,
            errors: [
                `Cancellation window validation failed: ${(error as Error).message}`,
            ],
            warnings: [],
        };
    }
}

/**
 * 10. REFUND VALIDATION
 *
 * Validates refund amount against payment amount.
 */
export async function validateRefundAmount(
    paymentId: string,
    refundAmount: number
): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            select: {
                id: true,
                amount: true,
                status: true,
                refundAmount: true,
                refundStatus: true,
            },
        });

        if (!payment) {
            return {
                safe: false,
                errors: ['Payment not found'],
                warnings: [],
            };
        }

        if (payment.status !== 'PAID' && payment.status !== 'OVERPAID') {
            errors.push(`Cannot refund payment with status ${payment.status}`);
        }

        if (payment.refundStatus === 'PROCESSED' || payment.refundStatus === 'COMPLETED') {
            errors.push('Refund has already been processed for this payment');
        }

        const paidAmount = payment.amount.toNumber();
        const alreadyRefunded = payment.refundAmount?.toNumber() ?? 0;
        const maxRefund = paidAmount - alreadyRefunded;

        if (refundAmount <= 0) {
            errors.push('Refund amount must be greater than 0');
        }

        if (refundAmount > maxRefund) {
            errors.push(
                `Refund amount ₹${refundAmount} exceeds maximum refundable ₹${maxRefund}`
            );
        }

        if (refundAmount === paidAmount) {
            warnings.push('Full refund - requires admin approval');
        }

        return {
            safe: errors.length === 0,
            errors,
            warnings,
        };
    } catch (error) {
        return {
            safe: false,
            errors: [`Refund validation failed: ${(error as Error).message}`],
            warnings: [],
        };
    }
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

function formatDateTime(date: Date | null): string {
    if (!date) return 'N/A';
    return date.toISOString().replace('T', ' ').split('.')[0];
}

function formatDateRange(checkIn: Date, checkOut: Date): string {
    return `${formatDate(checkIn)} to ${formatDate(checkOut)}`;
}

// ─── Bulk Validators ───────────────────────────────────────────────────────────

/**
 * Run multiple validations and aggregate results.
 * Useful for critical operations like check-in.
 */
export async function validateCheckinReadiness(
    bookingId: string,
    roomId: string
): Promise<ValidationResult> {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // 1. No duplicate check-in
    const dupCheck = await validateNoDuplicateCheckin(bookingId);
    allErrors.push(...dupCheck.errors);
    allWarnings.push(...dupCheck.warnings);

    // 2. Room ready
    const roomReady = await validateRoomReadyForCheckin(roomId);
    allErrors.push(...roomReady.errors);
    allWarnings.push(...roomReady.warnings);

    return {
        safe: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
    };
}

/**
 * Run multiple validations for booking creation.
 */
export async function validateBookingCreation(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    guestId?: string
): Promise<ValidationResult> {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // 1. No double booking
    const doubleBook = await validateNoDoubleBooking({ roomId, checkIn, checkOut });
    allErrors.push(...doubleBook.errors);
    allWarnings.push(...doubleBook.warnings);

    // 2. Room availability consistency
    const roomConsistency = await validateRoomAvailabilityConsistency(roomId);
    allErrors.push(...roomConsistency.errors);
    allWarnings.push(...roomConsistency.warnings);

    // 3. Guest not blacklisted (if guestId provided)
    if (guestId) {
        const blacklist = await validateGuestNotBlacklisted(guestId);
        allErrors.push(...blacklist.errors);
        allWarnings.push(...blacklist.warnings);
    }

    return {
        safe: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
    };
}
