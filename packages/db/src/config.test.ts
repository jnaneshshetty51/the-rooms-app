/**
 * Config and Utility Functions Tests
 * 
 * Tests for:
 * - hasDateOverlap (pure function)
 * - calculateNights
 * - shouldUseMonthlyRate
 * - calculateExtraGuestCharge
 */

import { describe, it, expect } from 'vitest';
import {
    PRICING_CONFIG,
    BOOKING_CONFIG,
    hasDateOverlap,
    calculateNights,
    shouldUseMonthlyRate,
    calculateExtraGuestCharge,
} from './config';

describe('Config - Date Overlap', () => {
    // ═══════════════════════════════════════════════════════════════════════════
    // HAPPY PATH
    // ═══════════════════════════════════════════════════════════════════════════

    describe('hasDateOverlap (Happy Path)', () => {
        it('should detect overlap when new booking starts during existing', () => {
            // Existing: June 1-5, New: June 3-7 → Overlap
            const result = hasDateOverlap(
                new Date('2024-06-01'),
                new Date('2024-06-05'),
                new Date('2024-06-03'),
                new Date('2024-06-07')
            );
            expect(result).toBe(true);
        });

        it('should detect overlap when new booking ends during existing', () => {
            // Existing: June 5-10, New: June 1-7 → Overlap
            const result = hasDateOverlap(
                new Date('2024-06-05'),
                new Date('2024-06-10'),
                new Date('2024-06-01'),
                new Date('2024-06-07')
            );
            expect(result).toBe(true);
        });

        it('should detect overlap when new contains existing', () => {
            // Existing: June 3-5, New: June 1-10 → Overlap
            const result = hasDateOverlap(
                new Date('2024-06-03'),
                new Date('2024-06-05'),
                new Date('2024-06-01'),
                new Date('2024-06-10')
            );
            expect(result).toBe(true);
        });

        it('should detect overlap when existing contains new', () => {
            // Existing: June 1-10, New: June 3-5 → Overlap
            const result = hasDateOverlap(
                new Date('2024-06-01'),
                new Date('2024-06-10'),
                new Date('2024-06-03'),
                new Date('2024-06-05')
            );
            expect(result).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // EDGE CASES - No Overlap
    // ═══════════════════════════════════════════════════════════════════════════

    describe('hasDateOverlap (Edge Cases - No Overlap)', () => {
        it('should NOT detect overlap for back-to-back bookings', () => {
            // Existing: June 1-5, New: June 5-10 → No overlap (checkout day is free)
            const result = hasDateOverlap(
                new Date('2024-06-01'),
                new Date('2024-06-05'),
                new Date('2024-06-05'),
                new Date('2024-06-10')
            );
            expect(result).toBe(false);
        });

        it('should NOT detect overlap for completely separate bookings', () => {
            // Existing: June 1-5, New: June 10-15 → No overlap
            const result = hasDateOverlap(
                new Date('2024-06-01'),
                new Date('2024-06-05'),
                new Date('2024-06-10'),
                new Date('2024-06-15')
            );
            expect(result).toBe(false);
        });

        it('should NOT detect overlap when new is exactly before existing', () => {
            // Existing: June 10-15, New: June 1-5 → No overlap
            const result = hasDateOverlap(
                new Date('2024-06-10'),
                new Date('2024-06-15'),
                new Date('2024-06-01'),
                new Date('2024-06-05')
            );
            expect(result).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // EDGE CASES - Boundary Conditions
    // ═══════════════════════════════════════════════════════════════════════════

    describe('hasDateOverlap (Boundary Conditions)', () => {
        it('should handle same-day checkout/checkin as no overlap', () => {
            const result = hasDateOverlap(
                new Date('2024-06-01'),
                new Date('2024-06-01'), // Same day -0 length
                new Date('2024-06-01'),
                new Date('2024-06-02')
            );
            // checkIn1 < checkOut2 (01< 02) && checkOut1 > checkIn2 (01 > 01 = false)
            expect(result).toBe(false);
        });

        it('should handle exact same dates as overlap', () => {
            const result = hasDateOverlap(
                new Date('2024-06-01'),
                new Date('2024-06-05'),
                new Date('2024-06-01'),
                new Date('2024-06-05')
            );
            expect(result).toBe(true);
        });
    });
});

describe('Config - calculateNights', () => {
    it('should calculate 2 nights for check-in June 1 to check-out June 3', () => {
        const result = calculateNights(
            new Date('2024-06-01'),
            new Date('2024-06-03')
        );
        expect(result).toBe(2);
    });

    it('should calculate1 night for same-day checkout', () => {
        const result = calculateNights(
            new Date('2024-06-01'),
            new Date('2024-06-02')
        );
        expect(result).toBe(1);
    });

    it('should return minimum 1 night for same-day dates', () => {
        const result = calculateNights(
            new Date('2024-06-01'),
            new Date('2024-06-01')
        );
        expect(result).toBe(1);
    });

    it('should return minimum 1 night when checkout is before checkin', () => {
        const result = calculateNights(
            new Date('2024-06-05'),
            new Date('2024-06-01')
        );
        expect(result).toBe(1);
    });

    it('should calculate 28 nights for monthly booking', () => {
        const result = calculateNights(
            new Date('2024-06-01'),
            new Date('2024-06-29')
        );
        expect(result).toBe(28);
    });
});

describe('Config - shouldUseMonthlyRate', () => {
    it('should return true for STUDIO with explicit MONTHLY type', () => {
        const result = shouldUseMonthlyRate('MONTHLY', 'STUDIO', 7);
        expect(result).toBe(true);
    });

    it('should return true for STUDIO with >= 28 nights even with DAILY type', () => {
        const result = shouldUseMonthlyRate('DAILY', 'STUDIO', 28);
        expect(result).toBe(true);
    });

    it('should return false for STUDIO with < 28 nights and DAILY type', () => {
        const result = shouldUseMonthlyRate('DAILY', 'STUDIO', 27);
        expect(result).toBe(false);
    });

    it('should return false for PREMIUM room even with >= 28 nights', () => {
        const result = shouldUseMonthlyRate('DAILY', 'PREMIUM', 30);
        expect(result).toBe(false);
    });

    it('should return false for PREMIUM room even with explicit MONTHLY type', () => {
        // Note: Monthly pricing is only available for STUDIO rooms
        const result = shouldUseMonthlyRate('MONTHLY', 'PREMIUM', 7);
        expect(result).toBe(false);
    });
});

describe('Config - calculateExtraGuestCharge', () => {
    it('should return 0 for 2 guests (double occupancy)', () => {
        const result = calculateExtraGuestCharge(2, 2, false);
        expect(result).toBe(0);
    });

    it('should return 0 for 1 guest', () => {
        const result = calculateExtraGuestCharge(1, 2, false);
        expect(result).toBe(0);
    });

    it('should calculate ₹1000 for 3 guests (1 extra) × 2 nights', () => {
        const result = calculateExtraGuestCharge(3, 2, false);
        expect(result).toBe(1000); // 500 × 1 × 2
    });

    it('should calculate ₹2000 for 4 guests (2 extra) × 2 nights', () => {
        const result = calculateExtraGuestCharge(4, 2, false);
        expect(result).toBe(2000); // 500 × 2 × 2
    });

    it('should return 0 for MONTHLY bookings regardless of guests', () => {
        const result = calculateExtraGuestCharge(5, 28, true);
        expect(result).toBe(0);
    });

    it('should calculate ₹500 for 3 guests × 1 night', () => {
        const result = calculateExtraGuestCharge(3, 1, false);
        expect(result).toBe(500); // 500 × 1 × 1
    });
});

describe('Config - Constants', () => {
    it('should have correct GST rate (18%)', () => {
        expect(PRICING_CONFIG.GST_RATE).toBe(0.18);
    });

    it('should have correct extra guest rate (₹500)', () => {
        expect(PRICING_CONFIG.EXTRA_GUEST_RATE_DAILY).toBe(500);
    });

    it('should have correct monthly threshold (28 nights)', () => {
        expect(PRICING_CONFIG.MONTHLY_THRESHOLD_NIGHTS).toBe(28);
    });

    it('should have correct minimum nights (1)', () => {
        expect(PRICING_CONFIG.MINIMUM_NIGHTS).toBe(1);
    });

    it('should have correct free guests count (2)', () => {
        expect(PRICING_CONFIG.FREE_GUESTS_COUNT).toBe(2);
    });
});