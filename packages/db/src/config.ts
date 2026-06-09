/**
 * Pricing and Booking Configuration
 * 
 * Centralized constants for easy testing and configuration.
 */

export const PRICING_CONFIG = {
    /** GST rate (18%) */
    GST_RATE: 0.18,
    /** Extra guest charge per night for DAILY bookings (₹500) */
    EXTRA_GUEST_RATE_DAILY: 500,
    /** Minimum nights before monthly rate applies for STUDIO rooms */
    MONTHLY_THRESHOLD_NIGHTS: 28,
    /** Default minimum nights for any booking */
    MINIMUM_NIGHTS: 1,
    /** Maximum free guests (double occupancy = 2 guests) */
    FREE_GUESTS_COUNT: 2,
} as const;

export const BOOKING_CONFIG = {
    /** Maximum guests allowed per room */
    MAX_GUESTS: 10,
    /** Booking number prefix */
    BOOKING_NUMBER_PREFIX: 'BKN',
    /** Invoice number prefix */
    INVOICE_NUMBER_PREFIX: 'INV',
} as const;

/**
 * Check if two date ranges overlap.
 * 
 * Overlap occurs when: start1 < end2 AND end1 > start2
 * 
 * Visual:
 * [==== Range 1 ====]
 *      [==== Range 2 ====]  → Overlap
 * 
 * [==== Range 1 ====]
 * [== Range 2 ==] → Overlap
 * 
 * @param checkIn1 - Start of first range
 * @param checkOut1 - End of first range
 * @param checkIn2 - Start of second range
 * @param checkOut2 - End of second range
 * @returns true if ranges overlap
 */
export function hasDateOverlap(
    checkIn1: Date,
    checkOut1: Date,
    checkIn2: Date,
    checkOut2: Date
): boolean {
    return checkIn1 < checkOut2 && checkOut1 > checkIn2;
}

/**
 * Calculate number of nights between check-in and check-out.
 * Ensures minimum of 1 night.
 */
export function calculateNights(checkIn: Date, checkOut: Date): number {
    return Math.max(
        PRICING_CONFIG.MINIMUM_NIGHTS,
        Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    );
}

/**
 * Check if a booking should use monthly rate.
 * Applies to STUDIO rooms with >=28 nights.
 */
export function shouldUseMonthlyRate(
    bookingType: 'DAILY' | 'MONTHLY',
    roomType: 'STUDIO' | 'PREMIUM',
    nights: number
): boolean {
    return (bookingType === 'MONTHLY' || nights >= PRICING_CONFIG.MONTHLY_THRESHOLD_NIGHTS)
        && roomType === 'STUDIO';
}

/**
 * Calculate extra guest charge.
 * Only applies to DAILY bookings with guests > 2.
 */
export function calculateExtraGuestCharge(
    guestsCount: number,
    nights: number,
    isMonthly: boolean
): number {
    if (isMonthly || guestsCount <= PRICING_CONFIG.FREE_GUESTS_COUNT) {
        return 0;
    }
    const extraGuests = guestsCount - PRICING_CONFIG.FREE_GUESTS_COUNT;
    return PRICING_CONFIG.EXTRA_GUEST_RATE_DAILY * extraGuests * nights;
}