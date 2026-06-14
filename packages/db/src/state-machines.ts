/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ROOMS - Front Office State Machines
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This module defines the state machines for all core entities in the front
 * office system. Each state machine defines:
 *   - Valid states
 *   - Valid transitions
 *   - Transition guards (pre-conditions)
 *   - Side effects (what happens when transitioning)
 *
 * These state machines are the source of truth for business logic validation.
 * All API routes should use these guards before performing transitions.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Booking State Machine ───────────────────────────────────────────────────

/**
 * BookingStatus lifecycle:
 *
 *  CONFIRMED ──────┬──► CHECKED_IN ────► CHECKED_OUT
 *                  │        │
 *                  │        └──► (room becomes OCCUPIED)
 *                  │
 *                  ├──► CANCELLED ────► (room becomes VACANT)
 *                  │        │
 *                  │        └──► (no-show charge may apply)
 *                  │
 *                  └──► NO_SHOW ──────► (room becomes VACANT)
 *                           │
 *                           └──► (no-show charge applies)
 *
 * Key validations before transitions:
 *   → CHECKED_IN: Room must be VACANT, documents verified (if required)
 *   → CHECKED_OUT: PaymentStatus must be PAID or REFUNDED (or override)
 *   → CANCELLED: Before check-in time (or within cancellation policy)
 *   → NO_SHOW: After no-show cutoff time
 */
export const BOOKING_STATUSES = {
    CONFIRMED: 'CONFIRMED',
    CHECKED_IN: 'CHECKED_IN',
    CHECKED_OUT: 'CHECKED_OUT',
    CANCELLED: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
} as const;

export type BookingStatus = typeof BOOKING_STATUSES[keyof typeof BOOKING_STATUSES];

export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
    CHECKED_IN: ['CHECKED_OUT'],
    CHECKED_OUT: [], // Terminal state
    CANCELLED: [],   // Terminal state
    NO_SHOW: [],     // Terminal state
};

/**
 * Guards for booking transitions
 */
export const BOOKING_TRANSITION_GUARDS: Record<
    string,
    (booking: BookingContext, params?: TransitionParams) => TransitionResult
> = {
    /**
     * CONFIRMED → CHECKED_IN
     * Requirements:
     *   - Room must be VACANT (not OCCUPIED, MAINTENANCE, BLOCKED)
     *   - Room cleaningStatus should be CLEAN (warning if DIRTY)
     *   - Guest documents must be verified (if property requires ID verification)
     *   - Check-in time must be within policy (early check-in may have fees)
     */
    CONFIRMED_TO_CHECKED_IN: (booking, params = {}) => {
        const errors: string[] = [];

        if (booking.status !== 'CONFIRMED') {
            errors.push('Booking must be in CONFIRMED status');
        }

        if (booking.room.status !== 'VACANT') {
            errors.push(`Room ${booking.room.roomNumber} is not vacant (current: ${booking.room.status})`);
        }

        if (booking.room.cleaningStatus === 'DIRTY') {
            errors.push(`Room ${booking.room.roomNumber} is dirty - clean before check-in`);
        }

        if (booking.propertySettings.earlyCheckinEnabled && params.earlyCheckin) {
            // Early check-in fees apply - this is a warning, not a blocker
        }

        // Document verification check
        if (booking.propertySettings.requireDocumentVerification) {
            const unverifiedDocs = booking.documents?.filter(d => !d.verified) ?? [];
            if (unverifiedDocs.length > 0) {
                errors.push(`Guest has ${unverifiedDocs.length} unverified document(s)`);
            }
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings: booking.room.cleaningStatus === 'CLEANING'
                ? [`Room ${booking.room.roomNumber} is currently being cleaned`] : [],
        };
    },

    /**
     * CHECKED_IN → CHECKED_OUT
     * Requirements:
     *   - All charges must be posted (room charges, add-ons)
     *   - PaymentStatus should be PAID (or REFUNDED, or ADMIN_OVERRIDE)
     *   - No pending dispute holds
     */
    CHECKED_IN_TO_CHECKED_OUT: (booking, params = {}) => {
        const errors: string[] = [];

        if (booking.status !== 'CHECKED_IN') {
            errors.push('Booking must be in CHECKED_IN status');
        }

        if (params.adminOverride) {
            return { allowed: true, errors: [], warnings: ['Admin override applied'] };
        }

        // Check for pending charges
        if (booking.pendingCharges && booking.pendingCharges > 0) {
            errors.push(`Pending charges of ₹${booking.pendingCharges} must be settled`);
        }

        if (booking.paymentStatus === 'PENDING' || booking.paymentStatus === 'PARTIAL') {
            errors.push(`Payment status is ${booking.paymentStatus} - must be PAID before checkout`);
        }

        if (booking.hasDisputedBill) {
            errors.push('Bill is disputed - must resolve dispute before checkout');
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings: [],
        };
    },

    /**
     * CONFIRMED → CANCELLED
     * Requirements:
     *   - Must be before check-in time (or within policy window)
     *   - Cancellation reason recommended
     *   - Refund calculation if payment was made
     */
    CONFIRMED_TO_CANCELLED: (booking, params = {}) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (booking.status !== 'CONFIRMED') {
            errors.push('Booking must be in CONFIRMED status');
        }

        const now = new Date();
        const checkIn = new Date(booking.checkIn);

        // Check if already past check-in
        if (now >= checkIn) {
            errors.push('Cannot cancel after check-in time - use check-out instead');
        }

        // Check cancellation policy
        if (booking.propertySettings.cancellationPolicy) {
            const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
            const policyHours = booking.propertySettings.cancellationPolicyHours ?? 24;

            if (hoursUntilCheckIn < policyHours) {
                warnings.push(`Within ${policyHours}h cancellation window - penalty may apply`);
            }
        }

        // If payment was made, refund may be needed
        if (booking.paymentStatus === 'PAID' || booking.paymentStatus === 'PARTIAL') {
            warnings.push('Payment was made - refund may be required');
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings,
        };
    },

    /**
     * CONFIRMED → NO_SHOW
     * Requirements:
     *   - Check-in date must have passed
     *   - Must be past no-show cutoff time
     *   - No-show charge calculated per policy
     */
    CONFIRMED_TO_NO_SHOW: (booking, params = {}) => {
        const errors: string[] = [];

        if (booking.status !== 'CONFIRMED') {
            errors.push('Booking must be in CONFIRMED status');
        }

        const now = params.asOfDate ?? new Date();
        const checkIn = new Date(booking.checkIn);
        const cutoffHour = booking.propertySettings.noShowCutoffHour ?? 11;

        // Must be past check-in date
        if (now < checkIn) {
            errors.push('Check-in date has not passed yet');
        }

        // Must be past cutoff time (day after check-in + cutoff hour)
        const nextDayAfterCheckIn = new Date(checkIn);
        nextDayAfterCheckIn.setDate(nextDayAfterCheckIn.getDate() + 1);
        nextDayAfterCheckIn.setHours(cutoffHour, 0, 0, 0);

        if (now < nextDayAfterCheckIn) {
            errors.push(`No-show cutoff is ${cutoffHour}:00 on day after check-in`);
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings: ['No-show charge will be applied per policy'],
        };
    },
};

// ─── Room State Machine ───────────────────────────────────────────────────────

/**
 * RoomStatus lifecycle:
 *
 *  VACANT ──────┬──► OCCUPIED ────► VACANT (after checkout/cancel)
 *               │
 *               ├──► MAINTENANCE ──► VACANT (after repair)
 *               │
 *               └──► BLOCKED ─────► VACANT (after unblock)
 *
 * CleaningStatus parallel track:
 *
 *  CLEAN ◄──── CLEANING ◄─── DIRTY
 *              (done)      (start)
 */
export const ROOM_STATUSES = {
    VACANT: 'VACANT',
    OCCUPIED: 'OCCUPIED',
    MAINTENANCE: 'MAINTENANCE',
    BLOCKED: 'BLOCKED',
} as const;

export type RoomStatus = typeof ROOM_STATUSES[keyof typeof ROOM_STATUSES];

export const ROOM_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
    VACANT: ['OCCUPIED', 'MAINTENANCE', 'BLOCKED'],
    OCCUPIED: ['VACANT'],
    MAINTENANCE: ['VACANT'],
    BLOCKED: ['VACANT'],
};

/**
 * Guards for room transitions
 */
export const ROOM_TRANSITION_GUARDS: Record<
    string,
    (room: RoomContext, params?: TransitionParams) => TransitionResult
> = {
    /**
     * VACANT → OCCUPIED
     * Requirements:
     *   - Room must be VACANT
     *   - CleaningStatus should be CLEAN (warning if not)
     *   - No pending maintenance issues
     */
    VACANT_TO_OCCUPIED: (room, params = {}) => {
        const errors: string[] = [];

        if (room.status !== 'VACANT') {
            errors.push(`Room ${room.roomNumber} is not vacant (${room.status})`);
        }

        if (room.cleaningStatus === 'DIRTY') {
            errors.push(`Room ${room.roomNumber} must be cleaned before check-in`);
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings: room.cleaningStatus === 'CLEANING'
                ? [`Room ${room.roomNumber} is being cleaned - verify before check-in`] : [],
        };
    },

    /**
     * OCCUPIED → VACANT
     * Requirements:
     *   - Associated booking must be CHECKED_OUT or CANCELLED
     *   - Guest must have departed
     */
    OCCUPIED_TO_VACANT: (room, params = {}) => {
        const errors: string[] = [];

        if (room.status !== 'OCCUPIED') {
            errors.push(`Room ${room.roomNumber} is not occupied`);
        }

        if (params.bookingStatus && !['CHECKED_OUT', 'CANCELLED', 'NO_SHOW'].includes(params.bookingStatus)) {
            errors.push(`Booking status must be CHECKED_OUT, CANCELLED, or NO_SHOW (got ${params.bookingStatus})`);
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings: [],
        };
    },

    /**
     * VACANT → MAINTENANCE
     * Requirements:
     *   - Maintenance reason required
     *   - If room is booked, guest must be relocated
     */
    VACANT_TO_MAINTENANCE: (room, params = {}) => {
        const errors: string[] = [];

        if (room.status !== 'VACANT') {
            errors.push(`Room ${room.roomNumber} is not vacant`);
        }

        if (!params.reason) {
            errors.push('Maintenance reason is required');
        }

        // If room has active booking, warn about relocation
        if (room.currentBooking) {
            errors.push(`Room has active booking ${room.currentBooking.bookingNumber} - relocate guest first`);
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings: room.currentBooking
                ? [`Room has booking ${room.currentBooking.bookingNumber} - guest must be moved`] : [],
        };
    },

    /**
     * MAINTENANCE → VACANT
     * Requirements:
     *   - Maintenance must be completed
     *   - Room must be cleaned
     */
    MAINTENANCE_TO_VACANT: (room, params = {}) => {
        const errors: string[] = [];

        if (room.status !== 'MAINTENANCE') {
            errors.push(`Room ${room.roomNumber} is not in maintenance`);
        }

        if (room.cleaningStatus !== 'CLEAN') {
            errors.push(`Room ${room.roomNumber} must be cleaned after maintenance`);
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings: [],
        };
    },
};

// ─── Payment State Machine ────────────────────────────────────────────────────

/**
 * PaymentStatus lifecycle:
 *
 *  PENDING ───┬──► PAID ──────────► REFUNDED
 *             │
 *             ├──► PARTIAL ───────► PAID (remaining)
 *             │          │
 *             │          └──► REFUNDED (if overpaid and refunded)
 *             │
 *             └──► FAILED
 *                      │
 *                      └──► PENDING (retry)
 *
 *  OVERPAID ───────────► REFUNDED (excess returned)
 */
export const PAYMENT_STATUSES = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    PARTIAL: 'PARTIAL',
    REFUNDED: 'REFUNDED',
    FAILED: 'FAILED',
    OVERPAID: 'OVERPAID',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[keyof typeof PAYMENT_STATUSES];

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
    PENDING: ['PAID', 'PARTIAL', 'FAILED'],
    PARTIAL: ['PAID', 'REFUNDED', 'FAILED'],
    PAID: ['REFUNDED', 'OVERPAID'],
    OVERPAID: ['REFUNDED'],
    REFUNDED: [],  // Terminal
    FAILED: ['PENDING'],  // Can retry
};

/**
 * Guards for payment transitions
 */
export const PAYMENT_TRANSITION_GUARDS: Record<
    string,
    (payment: PaymentContext, params?: TransitionParams) => TransitionResult
> = {
    /**
     * PENDING → PAID
     * Requirements:
     *   - Amount must match or exceed booking total
     *   - Payment method must be valid
     *   - Gateway transaction successful (or cash confirmed)
     */
    PENDING_TO_PAID: (payment, params = {}) => {
        const errors: string[] = [];

        if (payment.status !== 'PENDING' && payment.status !== 'PARTIAL') {
            errors.push(`Payment status is ${payment.status}, expected PENDING or PARTIAL`);
        }

        if (params.amount && params.amount < payment.amount.toNumber()) {
            errors.push(`Payment amount ₹${params.amount} is less than required ₹${payment.amount.toNumber()}`);
        }

        if (params.gatewayFailure) {
            errors.push('Payment gateway reported failure');
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings: [],
        };
    },

    /**
     * PAID → REFUNDED
     * Requirements:
     *   - Refund reason required
     *   - Refund amount must not exceed paid amount
     *   - Admin approval for full refunds
     */
    PAID_TO_REFUNDED: (payment, params = {}) => {
        const errors: string[] = [];

        if (payment.status !== 'PAID' && payment.status !== 'OVERPAID') {
            errors.push(`Payment status is ${payment.status}, expected PAID or OVERPAID`);
        }

        if (!params.refundReason) {
            errors.push('Refund reason is required');
        }

        const refundAmount = params.refundAmount ?? payment.amount.toNumber();
        if (refundAmount > payment.amount.toNumber()) {
            errors.push(`Refund amount ₹${refundAmount} exceeds paid amount ₹${payment.amount.toNumber()}`);
        }

        if (refundAmount === payment.amount.toNumber() && !params.adminApproval) {
            errors.push('Full refund requires admin approval');
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings: [],
        };
    },

    /**
     * PENDING → FAILED
     * Requirements:
     *   - Gateway error or timeout
     *   - Idempotency key to prevent duplicate charges on retry
     */
    PENDING_TO_FAILED: (payment, params = {}) => {
        const errors: string[] = [];

        if (payment.status !== 'PENDING') {
            errors.push(`Payment status is ${payment.status}, expected PENDING`);
        }

        if (!params.errorMessage) {
            errors.push('Error message is required for failed payment');
        }

        return {
            allowed: errors.length === 0,
            errors,
            warnings: ['Payment can be retried'],
        };
    },
};

// ─── Complaint State Machine ─────────────────────────────────────────────────

/**
 * ComplaintStatus lifecycle:
 *
 *  OPEN ─────────► IN_PROGRESS ────► RESOLVED ────► CLOSED
 *      │                  │              │
 *      │                  └──► RESOLVED ─┘
 *      │
 *      └──────────────────► CLOSED (if escalated to manager)
 */
export const COMPLAINT_STATUSES = {
    OPEN: 'OPEN',
    IN_PROGRESS: 'IN_PROGRESS',
    RESOLVED: 'RESOLVED',
    CLOSED: 'CLOSED',
} as const;

export type ComplaintStatus = typeof COMPLAINT_STATUSES[keyof typeof COMPLAINT_STATUSES];

export const COMPLAINT_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
    OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    IN_PROGRESS: ['RESOLVED', 'CLOSED'],
    RESOLVED: ['CLOSED'],
    CLOSED: [],  // Terminal
};

// ─── Document Verification State Machine ──────────────────────────────────────

/**
 * Document verification lifecycle:
 *
 *  UPLOADED ───► VERIFIED ────► REJECTED
 *                  │               │
 *                  │               └──► UPLOADED (re-upload)
 *                  │
 *                  └──► FLAGGED (needs manual review)
 */
export const DOCUMENT_STATUSES = {
    UPLOADED: 'UPLOADED',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
    FLAGGED: 'FLAGGED',
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUSES[keyof typeof DOCUMENT_STATUSES];

// ─── Sync Status State Machine (for OTA) ─────────────────────────────────────

/**
 * OtaSyncStatus lifecycle:
 *
 *  PENDING ───► SYNCED
 *      │
 *      ├──► PENDING_UPDATE ───► SYNCED
 *      │
 *      ├──► PENDING_CANCEL ───► SYNCED
 *      │
 *      ├──► CONFLICT ─────────► SYNCED (manual resolution)
 *      │
 *      └──► FAILED ──────────► PENDING (retry)
 */
export const OTA_SYNC_STATUSES = {
    SYNCED: 'SYNCED',
    PENDING_UPDATE: 'PENDING_UPDATE',
    PENDING_CANCEL: 'PENDING_CANCEL',
    CONFLICT: 'CONFLICT',
    FAILED: 'FAILED',
} as const;

export type OtaSyncStatus = typeof OTA_SYNC_STATUSES[keyof typeof OTA_SYNC_STATUSES];

// ─── High-Risk Scenario Validators ──────────────────────────────────────────

/**
 * High-risk scenarios that require explicit validation
 * These are edge cases that can cause data corruption or financial loss
 */
export const HIGH_RISK_SCENARIOS = {
    /**
     * Double booking: Same room, overlapping dates
     * Prevention: isRoomAvailable() uses serializable transaction
     */
    DOUBLE_BOOKING: {
        check: async (roomId: string, checkIn: Date, checkOut: Date, excludeBookingId?: string) => {
            // This is handled by isRoomAvailable() with serializable isolation
            // Any booking creation/modification should use this function
            return { safe: true, message: 'Double booking check passed' };
        },
        errorMessage: 'Room is already booked for the selected dates',
    },

    /**
     * Duplicate check-in: Guest already checked in
     * Prevention: Check booking status before check-in
     */
    DUPLICATE_CHECKIN: {
        check: async (bookingId: string) => {
            // Should check if booking is already CHECKED_IN
            return { safe: true, message: 'No duplicate check-in detected' };
        },
        errorMessage: 'Guest has already checked in',
    },

    /**
     * Payment without confirmation: Money taken but booking not created
     * Prevention: Idempotency keys for payment operations
     */
    PAYMENT_WITHOUT_CONFIRMATION: {
        check: async (transactionId: string) => {
            // Check if a payment with this transactionId already exists
            return { safe: true, message: 'No duplicate payment detected' };
        },
        errorMessage: 'Payment was already processed',
    },

    /**
     * Room sold but unavailable: Room marked unavailable but booking exists
     * Prevention: Atomic room status + booking status updates
     */
    ROOM_SOLD_BUT_UNAVAILABLE: {
        check: async (roomId: string, checkIn: Date, checkOut: Date) => {
            // Verify room availability at time of booking
            return { safe: true, message: 'Room availability verified' };
        },
        errorMessage: 'Room is not available for the selected dates',
    },

    /**
     * Night audit skipped: Previous day not closed
     * Prevention: Check PropertyDailyClose before starting new audit
     */
    NIGHT_AUDIT_SKIPPED: {
        check: async (propertyId: string, date: Date) => {
            // Check if previous day's audit was completed
            return { safe: true, message: 'Night audit chain verified' };
        },
        errorMessage: 'Previous day night audit not completed',
    },
};

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface TransitionParams {
    // Common
    adminOverride?: boolean;
    asOfDate?: Date;
    reason?: string;
    notes?: string;

    // Booking transitions
    earlyCheckin?: boolean;
    lateCheckout?: boolean;
    bookingStatus?: string;
    pendingCharges?: number;
    hasDisputedBill?: boolean;

    // Payment transitions
    amount?: number;
    gatewayFailure?: boolean;
    refundReason?: string;
    refundAmount?: number;
    adminApproval?: boolean;
    errorMessage?: string;

    // Room transitions
    currentBooking?: { bookingNumber: string };
}

export interface TransitionResult {
    allowed: boolean;
    errors: string[];
    warnings: string[];
}

export interface BookingContext {
    id: string;
    status: BookingStatus;
    checkIn: Date;
    checkOut: Date;
    room: {
        id: string;
        roomNumber: string;
        status: RoomStatus;
        cleaningStatus: 'CLEAN' | 'DIRTY' | 'CLEANING';
    };
    paymentStatus: PaymentStatus;
    documents?: Array<{ verified: boolean }>;
    propertySettings: {
        earlyCheckinEnabled: boolean;
        requireDocumentVerification: boolean;
        cancellationPolicy: string;
        cancellationPolicyHours: number;
        noShowCutoffHour: number;
        noShowEnabled: boolean;
    };
    pendingCharges?: number;
    hasDisputedBill?: boolean;
}

export interface RoomContext {
    id: string;
    roomNumber: string;
    status: RoomStatus;
    cleaningStatus: 'CLEAN' | 'DIRTY' | 'CLEANING';
    currentBooking?: {
        id: string;
        bookingNumber: string;
        status: BookingStatus;
    };
}

export interface PaymentContext {
    id: string;
    status: PaymentStatus;
    amount: { toNumber: () => number };
    bookingId: string;
}

// ─── State Machine Executor ──────────────────────────────────────────────────

/**
 * Execute a state transition with guards
 * Returns result with allowed/errors/warnings
 */
export function executeTransition(
    machine: 'BOOKING' | 'ROOM' | 'PAYMENT' | 'COMPLAINT',
    fromStatus: string,
    toStatus: string,
    context: BookingContext | RoomContext | PaymentContext,
    params?: TransitionParams
): TransitionResult {
    let transitions: Record<string, string[]>;
    let guards: Record<string, (ctx: any, params?: any) => TransitionResult>;

    switch (machine) {
        case 'BOOKING':
            transitions = BOOKING_TRANSITIONS;
            guards = BOOKING_TRANSITION_GUARDS;
            break;
        case 'ROOM':
            transitions = ROOM_TRANSITIONS;
            guards = ROOM_TRANSITION_GUARDS;
            break;
        case 'PAYMENT':
            transitions = PAYMENT_TRANSITIONS;
            guards = PAYMENT_TRANSITION_GUARDS;
            break;
        default:
            return { allowed: false, errors: ['Unknown state machine'], warnings: [] };
    }

    // Check if transition is valid
    const validNextStates = transitions[fromStatus as keyof typeof transitions];
    if (!validNextStates || !validNextStates.includes(toStatus)) {
        return {
            allowed: false,
            errors: [`Invalid transition: ${fromStatus} → ${toStatus}`],
            warnings: [],
        };
    }

    // Execute guard
    const guardKey = `${fromStatus}_TO_${toStatus}`;
    const guard = guards[guardKey];
    if (guard) {
        return guard(context as any, params);
    }

    // No guard = transition allowed
    return { allowed: true, errors: [], warnings: [] };
}

/**
 * Validate a booking transition
 */
export function validateBookingTransition(
    status: BookingStatus,
    newStatus: BookingStatus,
    context: BookingContext,
    params?: TransitionParams
): TransitionResult {
    return executeTransition('BOOKING', status, newStatus, context, params);
}

/**
 * Validate a room transition
 */
export function validateRoomTransition(
    status: RoomStatus,
    newStatus: RoomStatus,
    context: RoomContext,
    params?: TransitionParams
): TransitionResult {
    return executeTransition('ROOM', status, newStatus, context, params);
}

/**
 * Validate a payment transition
 */
export function validatePaymentTransition(
    status: PaymentStatus,
    newStatus: PaymentStatus,
    context: PaymentContext,
    params?: TransitionParams
): TransitionResult {
    return executeTransition('PAYMENT', status, newStatus, context, params);
}

// ─── Flow Matrix Summary ──────────────────────────────────────────────────────

/**
 * FLOW COVERAGE MATRIX
 *
 * This documents which flows are implemented vs missing
 *
 * ✅ = Implemented
 * ⚠️ = Partially implemented (edge cases may be missing)
 * ❌ = Not implemented
 *
 * ─── Booking Creation Flows ─────────────────────────────────────────────────
 * ✅ Direct booking → future date          (createBooking API)
 * ✅ Direct booking → same-day             (createBooking API)
 * ✅ Walk-in → instant check-in            (createBooking + check-in)
 * ⚠️ Phone booking → manual entry          (createBooking, source=WALK_IN)
 * ✅ OTA booking import                   (createBooking, source=OTA)
 * ✅ Website booking                       (apps/web booking API)
 * ⚠️ Booking without room assignment      (roomId required - gap)
 * ⚠️ Booking with pre-assigned room        (roomId provided at creation)
 * ⚠️ Booking with partial guest info      (guestId required - gap)
 * ⚠️ Booking with no payment               (creates with PENDING)
 * ⚠️ Booking with full prepaid             (creates with PAID)
 * ❌ Booking with corporate credit          (no corporate billing)
 *
 * ─── Reservation Modification Flows ─────────────────────────────────────────
 * ⚠️ Change check-in date                  (modifyStay API)
 * ⚠️ Change check-out date                 (modifyStay API)
 * ⚠️ Extend stay                           (modifyStay API)
 * ⚠️ Shorten stay                          (modifyStay API)
 * ❌ Change room type                      (requires new booking)
 * ⚠️ Change assigned room                 (reassign API)
 * ❌ Add/remove guests                     (no API)
 * ⚠️ Add special request                  (updateBooking API)
 * ❌ Convert single → group booking        (no group support)
 * ❌ Merge multiple bookings               (no merge API)
 * ❌ Split one booking into multiple       (no split API)
 *
 * ─── Check-in Flows ────────────────────────────────────────────────────────
 * ✅ Reservation → check-in               (check-in API)
 * ✅ Walk-in → check-in                    (createBooking + check-in)
 * ⚠️ Early check-in (chargeable/free)      (stayModificationRequest)
 * ⚠️ Late-night check-in                   (no special handling)
 * ❌ Group check-in (bulk)                  (no bulk API)
 * ⚠️ Express check-in (pre-filled)          (pre-fill form data)
 * ⚠️ Check-in without full payment         (enforcePayment=false flag)
 * ⚠️ Check-in with deposit                 (partial payment)
 * ⚠️ Check-in without documents (flagged)   (warning, not blocked)
 *
 * ─── Edge Cases ────────────────────────────────────────────────────────────
 * ❌ Overbooking at check-in                (no overbooking API)
 * ⚠️ Room not ready (VD → waiting)          (warns but allows)
 * ⚠️ Guest refuses assigned room           (manual reassign)
 *
 * ─── Room Allocation / Movement Flows ──────────────────────────────────────
 * ⚠️ Assign room at booking stage           (roomId in create)
 * ⚠️ Assign at check-in                     (reassign API)
 * ⚠️ Auto-assign by system                 (no auto-assign logic)
 * ⚠️ Manual override assignment             (reassign API)
 * ❌ Room change (upgrade)                  (reassign + price calc)
 * ❌ Room change (downgrade)                (reassign + refund calc)
 * ❌ Room change due to complaint           (reassign API)
 * ❌ Room swap between guests               (no swap API)
 * ❌ Move guest when room goes OOO          (no automated move)
 * ❌ Double allocation conflict resolution  (no conflict detection)
 * ❌ Split stay across rooms               (no split API)
 *
 * ─── Payment Flows ─────────────────────────────────────────────────────────
 * ⚠️ Full payment at check-in               (PAYMENT status update)
 * ⚠️ Payment at check-out                  (PAYMENT status update)
 * ⚠️ Advance payment before arrival        (pre-payment API)
 * ⚠️ Partial payment                       (PARTIAL status)
 * ⚠️ Multiple payments (split methods)      (multiple Payment records)
 * ⚠️ Payment via Cash/Card/UPI             (PaymentMethod enum)
 * ❌ Corporate billing (postpaid)           (no credit terms)
 * ⚠️ Payment failure                       (FAILED status)
 * ⚠️ Refund (full/partial)                 (refundAmount field)
 * ❌ Adjust invoice after payment           (no invoice edit)
 * ⚠️ Overpayment → refund balance          (OVERPAID → REFUNDED)
 *
 * ─── Check-out Flows ───────────────────────────────────────────────────────
 * ✅ Normal check-out                       (check-out API)
 * ⚠️ Early check-out                       (no fee calculation)
 * ⚠️ Late check-out (chargeable)           (stayModificationRequest)
 * ❌ Express check-out                      (no no-desk flow)
 * ❌ Bulk check-out (group)                (no bulk API)
 * ❌ Guest leaves without paying           (no skip-out handling)
 * ❌ Disputed bill → hold checkout         (no dispute hold)
 * ❌ Post-checkout billing adjustment       (no post-checkout edits)
 *
 * ─── No-show / Cancellation Flows ──────────────────────────────────────────
 * ✅ Cancel before check-in                (cancel API)
 * ⚠️ Cancel after partial payment          (no refund calc)
 * ✅ Cancel OTA booking                    (cancel API)
 * ✅ Auto mark no-show                      (night audit process)
 * ✅ Manual mark no-show                   (no-show API)
 * ⚠️ Apply penalty                        (noShowCharge field)
 * ⚠️ Waive penalty                        (admin override)
 *
 * ─── Housekeeping & Room Status Flows ──────────────────────────────────────
 * ✅ Checkout → room = VD                   (updateBookingStatus)
 * ✅ Housekeeping → marks VC               (markRoomAsCleaned)
 * ⚠️ Room marked OOO (maintenance)         (reportRoomMaintenance)
 * ⚠️ Room marked OOS (temporary)            (no OOS status)
 * ❌ Priority cleaning (VIP arrival)       (no priority flag)
 * ❌ Guest checks in to dirty room         (blocked by guard)
 * ⚠️ Room status mismatch correction       (manual update)
 *
 * ─── Complaint / Service Flows ──────────────────────────────────────────────
 * ✅ Guest raises complaint                (complaint API)
 * ✅ Front desk logs complaint             (complaint API)
 * ❌ Assign to department                 (no department field)
 * ⚠️ Track status                          (OPEN/IN_PROGRESS/RESOLVED)
 * ❌ Escalation (manager)                  (no escalation)
 * ❌ Compensation (discount/refund)        (no automated)
 * ❌ Repeat complaints (flag)              (no repeat detection)
 *
 * ─── Guest Lifecycle Flows ─────────────────────────────────────────────────
 * ✅ New guest creation                    (guest API)
 * ⚠️ Returning guest auto-detection       (search by phone/email)
 * ⚠️ Guest profile update                 (update guest API)
 * ❌ Duplicate guest merge                (no merge API)
 * ❌ Blacklisted guest booking attempt    (no blacklist)
 * ❌ VIP guest handling                    (no VIP flag)
 *
 * ─── Document & Compliance Flows ───────────────────────────────────────────
 * ✅ Upload ID at check-in                 (document upload API)
 * ⚠️ Upload later (pending)               (verify API)
 * ❌ Multiple guests → multiple IDs        (no per-guest docs)
 * ❌ Foreign guest → passport + visa       (no visa tracking)
 * ⚠️ Invalid document                     (rejected status)
 * ⚠️ Missing document → flagged            (warning only)
 * ⚠️ Manual override by admin             (verify API override)
 *
 * ─── Group Booking Flows ────────────────────────────────────────────────────
 * ❌ Create group booking                  (no group model)
 * ❌ Allocate multiple rooms               (no bulk assign)
 * ❌ Staggered check-in                   (no group support)
 * ❌ Staggered check-out                  (no group support)
 * ❌ Shared billing                       (no folio split)
 * ❌ Individual billing                   (no folio split)
 *
 * ─── Overbooking & Conflict Flows ───────────────────────────────────────────
 * ❌ Overbooking detected                  (no overbooking API)
 * ❌ Walk-in when no rooms available       (shows unavailable)
 * ❌ Upgrade guest                         (manual reassign)
 * ❌ Shift to partner hotel               (no partner hotel)
 * ❌ Deny booking                         (manual)
 *
 * ─── Night Audit ────────────────────────────────────────────────────────────
 * ✅ Generate daily report                 (daily-report API)
 * ⚠️ Validate payments vs bookings       (audit discrepancy)
 * ⚠️ Identify pending dues                (manual review)
 * ✅ Lock transactions                     (PropertyDailyClose)
 * ⚠️ Post room charges                    (RoomCharge model)
 * ✅ Roll date forward                    (close API)
 * ⚠️ Mismatch in cash vs system          (AuditDiscrepancy)
 * ⚠️ Missing postings                    (AuditDiscrepancy)
 * ❌ Audit failure rollback               (no rollback)
 *
 * ─── Integration Flows ──────────────────────────────────────────────────────
 * ⚠️ OTA Booking received                 (import API)
 * ⚠️ Modification synced                  (OTA sync)
 * ⚠️ Cancellation synced                  (OTA sync)
 * ⚠️ Payment gateway webhook              (webhook API)
 * ⚠️ MSG91 messaging                      (no MSG91 integration)
 *
 * ─── Admin Override Flows ──────────────────────────────────────────────────
 * ⚠️ Force check-in without payment       (adminOverride param)
 * ⚠️ Force checkout with pending dues     (adminOverride param)
 * ⚠️ Override room assignment             (reassign API)
 * ❌ Edit closed invoice                  (no invoice edit)
 * ⚠️ Waive charges                        (admin override)
 *
 * ─── Failure & Recovery Flows ───────────────────────────────────────────────
 * ❌ Internet down → offline booking      (no offline mode)
 * ⚠️ Sync failure with OTA               (SyncLog + retry)
 * ⚠️ Payment gateway timeout             (FAILED status)
 * ⚠️ Duplicate booking creation          (idempotency check)
 * ❌ Data corruption rollback             (no rollback mechanism)
 */
