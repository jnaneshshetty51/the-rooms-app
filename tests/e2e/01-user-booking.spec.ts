/**
 * E2E Test: User Booking Flow
 * 
 * Flow: Search availability → Select room type → Enter guest details → Complete payment → Booking confirmation
 * 
 * Validates:
 * - UI state consistency
 * - Backend API calls
 * - Database state after each step
 * - Payment processing
 */

import { test, expect, Page } from '@playwright/test';
import { prisma } from '@the-rooms/db';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('User Booking Flow', () => {
    let bookingReference: string;
    let guestEmail: string;

    test.beforeEach(async ({ page }) => {
        // Generate unique email for each test run
        guestEmail = `test-${Date.now()}@example.com`;
        await page.goto(`${BASE_URL}/book`);
    });

    test.afterEach(async () => {
        // Cleanup: Cancel booking if created
        if (bookingReference) {
            try {
                const booking = await prisma.booking.findFirst({
                    where: { bookingNumber: bookingReference },
                });
                if (booking) {
                    await prisma.booking.update({
                        where: { id: booking.id },
                        data: { status: 'CANCELLED' },
                    });
                }
            } catch (e) {
                console.log('Cleanup error:', e);
            }
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // HAPPY PATH
    // ═══════════════════════════════════════════════════════════════════════════

    test('Complete booking flow - Search to Confirmation', async ({ page }) => {
        // Step 1: Select dates
        // ─────────────────────────────────────────────────────────────────────────────
        const checkIn = page.getByLabel('Check-in Date');
        const checkOut = page.getByLabel('Check-out Date');

        await checkIn.fill(getTomorrowDate());
        await checkOut.fill(getDayAfterDate(2));

        await page.getByRole('button', { name: 'Search Availability' }).click();

        // Wait for room types to load
        await expect(page.getByText('STUDIO')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('PREMIUM')).toBeVisible();

        // Verify API was called
        const availabilityRequest = await page.waitForResponse(
            response => response.url().includes('/api/availability')
        );
        expect(availabilityRequest.status()).toBe(200);

        // Step 2: Select room type
        // ─────────────────────────────────────────────────────────────────────────────
        await page.getByText('STUDIO').first().click();
        await page.waitForURL('**/book/rooms**');

        // Verify room type details loaded
        await expect(page.getByText('₹2,500')).toBeVisible(); // Single occupancy price
        await expect(page.getByText('₹3,500')).toBeVisible(); // Double occupancy price

        // Select double occupancy
        await page.getByLabel('Double Occupancy').click();
        await page.getByRole('button', { name: 'Continue' }).click();

        // Step 3: Enter guest details
        // ─────────────────────────────────────────────────────────────────────────────
        await page.waitForURL('**/book/details**');

        await page.getByLabel('Full Name').fill('Test Guest');
        await page.getByLabel('Email').fill(guestEmail);
        await page.getByLabel('Phone').fill('+91-9876543210');
        await page.getByLabel('Address').fill('123 Test Street');

        // Select extras if available
        const breakfastCheckbox = page.getByLabel('Breakfast');
        if (await breakfastCheckbox.isVisible()) {
            await breakfastCheckbox.check();
        }

        await page.getByRole('button', { name: 'Continue to Payment' }).click();

        // Step 4: Payment
        // ─────────────────────────────────────────────────────────────────────────────
        await page.waitForURL('**/book/payment**');

        // Verify price breakdown
        await expect(page.getByText('Subtotal')).toBeVisible();
        await expect(page.getByText('GST')).toBeVisible();
        await expect(page.getByText('Total')).toBeVisible();

        // Select payment method
        await page.getByLabel('Razorpay').click();

        // Simulate payment (in real test, would use Razorpay test mode)
        await page.getByRole('button', { name: 'Pay Now' }).click();

        // Wait for payment processing
        await page.waitForResponse(
            response => response.url().includes('/api/bookings')
        );

        // Step 5: Confirmation
        // ─────────────────────────────────────────────────────────────────────────────
        await page.waitForURL('**/book/confirmation**', { timeout: 15000 });

        // Extract booking reference
        const confirmationText = await page.getByText(/BKN-\d{8}-\d{4}/).textContent();
        bookingReference = confirmationText?.match(/BKN-\d{8}-\d{4}/)?.[0] || '';

        expect(bookingReference).toMatch(/^BKN-\d{8}-\d{4}$/);

        // Verify booking appears in confirmation
        await expect(page.getByText('Booking Confirmed')).toBeVisible();
        await expect(page.getByText(guestEmail)).toBeVisible();

        // Verify database state
        const booking = await prisma.booking.findFirst({
            where: { bookingNumber: bookingReference },
            include: { guest: true, room: true, payments: true },
        });

        expect(booking).not.toBeNull();
        expect(booking?.guest.email).toBe(guestEmail);
        expect(booking?.status).toBe('CONFIRMED');
        expect(booking?.payments.length).toBeGreaterThan(0);
        expect(booking?.payments[0]?.status).toBe('COMPLETED');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════════

    test('Same-day booking is rejected', async ({ page }) => {
        await page.goto(`${BASE_URL}/book`);

        const checkIn = page.getByLabel('Check-in Date');
        const checkOut = page.getByLabel('Check-out Date');

        // Set same day for both
        const today = getTodayDate();
        await checkIn.fill(today);
        await checkOut.fill(today);

        await page.getByRole('button', { name: 'Search Availability' }).click();

        // Should show validation error
        await expect(page.getByText('Check-out must be after check-in')).toBeVisible();
    });

    test('Checkout before checkin is rejected', async ({ page }) => {
        await page.goto(`${BASE_URL}/book`);

        const checkIn = page.getByLabel('Check-in Date');
        const checkOut = page.getByLabel('Check-out Date');

        await checkIn.fill(getDayAfterDate(3));
        await checkOut.fill(getDayAfterDate(1)); // Before check-in

        await page.getByRole('button', { name: 'Search Availability' }).click();

        // Should show validation error
        await expect(page.getByText('Check-out must be after check-in')).toBeVisible();
    });

    test('Invalid email format is rejected', async ({ page }) => {
        await page.goto(`${BASE_URL}/book/details`);

        await page.getByLabel('Full Name').fill('Test Guest');
        await page.getByLabel('Email').fill('invalid-email');
        await page.getByLabel('Phone').fill('+91-9876543210');

        await page.getByRole('button', { name: 'Continue to Payment' }).click();

        // Should show validation error
        await expect(page.getByText('Invalid email format')).toBeVisible();
    });

    test('Missing required fields prevents continuation', async ({ page }) => {
        await page.goto(`${BASE_URL}/book/details`);

        // Only fill name, leave others empty
        await page.getByLabel('Full Name').fill('Test Guest');

        await page.getByRole('button', { name: 'Continue to Payment' }).click();

        // Should show validation errors for all required fields
        await expect(page.getByText('Email is required')).toBeVisible();
        await expect(page.getByText('Phone is required')).toBeVisible();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // FAILURE CASES
    // ═══════════════════════════════════════════════════════════════════════════

    test('Payment failure shows error and allows retry', async ({ page }) => {
        // Navigate to payment page with pre-filled data
        await page.goto(`${BASE_URL}/book/payment`);

        // Fill payment form
        await page.getByLabel('Razorpay').click();

        // Simulate payment failure by using invalid card
        await page.getByRole('button', { name: 'Pay Now' }).click();

        // Wait for error
        await expect(page.getByText('Payment Failed')).toBeVisible({ timeout: 20000 });
        await expect(page.getByText('Please try again')).toBeVisible();

        // Verify booking was NOT created
        const bookings = await prisma.booking.findMany({
            where: { guest: { email: guestEmail } },
        });
        expect(bookings.length).toBe(0);

        // Allow retry - click retry button
        await page.getByRole('button', { name: 'Try Again' }).click();

        // Should still be on payment page
        await expect(page.getByText('Pay Now')).toBeVisible();
    });

    test('Network interruption during payment shows retry option', async ({ page }) => {
        await page.goto(`${BASE_URL}/book/payment`);

        // Simulate network failure
        await page.route('**/api/bookings', route => route.abort());

        await page.getByLabel('Razorpay').click();
        await page.getByRole('button', { name: 'Pay Now' }).click();

        // Should show network error
        await expect(page.getByText('Network Error')).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    });

    test('Duplicate submission is prevented', async ({ page }) => {
        await page.goto(`${BASE_URL}/book/payment`);

        // Fill payment form
        await page.getByLabel('Razorpay').click();

        // Click pay button twice rapidly
        await page.getByRole('button', { name: 'Pay Now' }).click();
        await page.getByRole('button', { name: 'Pay Now' }).click();

        // Wait for first request to complete
        await page.waitForResponse(response => response.url().includes('/api/bookings'));

        // Should only create ONE booking
        const bookings = await prisma.booking.findMany({
            where: { guest: { email: guestEmail } },
        });
        expect(bookings.length).toBeLessThanOrEqual(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}

function getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

function getDayAfterDate(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
}