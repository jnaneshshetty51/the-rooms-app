/**
 * E2E Test: Checkout Flow
 * 
 * Flow: Payment settlement → Invoice generation → Room status update
 * 
 * Validates:
 * - Checkout workflow
 * - Payment finalization
 * - Invoice creation
 * - Room status change to VACANT
 */

import { test, expect, Page } from '@playwright/test';
import { prisma } from '@the-rooms/db';

const FO_BASE_URL = process.env.FO_BASE_URL || 'http://fo.therooms.in';

test.describe('Checkout Flow', () => {
    let bookingId: string;
    let roomId: string;

    test.beforeEach(async ({ page }) => {
        // Create a checked-in booking
        const booking = await createCheckedInBooking();
        bookingId = booking.id;
        roomId = booking.roomId;
    });

    test.afterEach(async () => {
        // Cleanup
        if (bookingId) {
            try {
                await prisma.booking.update({
                    where: { id: bookingId },
                    data: { status: 'CHECKED_OUT' },
                });
                await prisma.room.update({
                    where: { id: roomId },
                    data: { status: 'VACANT' },
                });
            } catch (e) {
                console.log('Cleanup error:', e);
            }
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // HAPPY PATH
    // ═══════════════════════════════════════════════════════════════════════════

    test('Complete checkout - Settlement to Room Release', async ({ page }) => {
        // Step 1: Login to Front Office
        // ─────────────────────────────────────────────────────────────────────────────
        await page.goto(`${FO_BASE_URL}/login`);
        await page.getByLabel('Email').fill('frontdesk@therooms.in');
        await page.getByLabel('Password').fill('password');
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Step 2: Navigate to booking
        // ─────────────────────────────────────────────────────────────────────────────
        await page.goto(`${FO_BASE_URL}/bookings/${bookingId}`);

        // Verify booking is checked-in
        await expect(page.getByText('CHECKED IN')).toBeVisible();

        // Step 3: Initiate checkout
        // ─────────────────────────────────────────────────────────────────────────────
        await page.getByRole('button', { name: 'Check Out' }).click();

        // Wait for checkout modal
        await expect(page.getByText('Complete Checkout')).toBeVisible();

        // Step 4: Review charges
        // ─────────────────────────────────────────────────────────────────────────────
        // Verify charges are displayed
        await expect(page.getByText('Room Charges')).toBeVisible();
        await expect(page.getByText('Extras')).toBeVisible();
        await expect(page.getByText('Total')).toBeVisible();

        // Step 5: Select payment settlement method
        // ─────────────────────────────────────────────────────────────────────────────
        await page.getByLabel('Settlement Method').selectOption('CARD');

        // Step 6: Complete checkout
        // ─────────────────────────────────────────────────────────────────────────────
        await page.getByRole('button', { name: 'Complete Checkout' }).click();

        // Wait for checkout to complete
        await page.waitForResponse(response => response.url().includes('/api/bookings'));

        // Verify redirect to booking details
        await page.waitForURL(`${FO_BASE_URL}/bookings/${bookingId}`);

        // Step 7: Verify status updated
        // ─────────────────────────────────────────────────────────────────────────────
        await expect(page.getByText('CHECKED OUT')).toBeVisible();

        // Verify room status is VACANT
        const room = await prisma.room.findUnique({
            where: { id: roomId },
        });
        expect(room?.status).toBe('VACANT');

        // Verify booking check-out time is set
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });
        expect(booking?.checkOutTime).not.toBeNull();
        expect(booking?.status).toBe('CHECKED_OUT');

        // Step 8: Verify invoice generated
        // ─────────────────────────────────────────────────────────────────────────────
        const invoice = await prisma.invoice.findFirst({
            where: { bookingId },
        });
        expect(invoice).not.toBeNull();
        expect(invoice?.pdfUrl).not.toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════════

    test('Checkout with pending payments shows warning', async ({ page }) => {
        // Create booking with partial payment
        const booking = await createCheckedInBooking();
        bookingId = booking.id;
        roomId = booking.roomId;

        // Add a pending payment
        await prisma.payment.create({
            data: {
                bookingId,
                amount: 5000,
                method: 'UPI',
                status: 'PENDING',
                transactionId: `TXN-PENDING-${Date.now()}`,
            },
        });

        await page.goto(`${FO_BASE_URL}/bookings/${bookingId}`);

        // Try to check out
        await page.getByRole('button', { name: 'Check Out' }).click();

        // Should show warning about pending payments
        await expect(page.getByText('Pending payments')).toBeVisible();
        await expect(page.getByText('₹5,000.00')).toBeVisible();
    });

    test('Checkout with zero balance shows immediate completion', async ({ page }) => {
        // Create fully paid booking
        const booking = await createCheckedInBooking();
        bookingId = booking.id;
        roomId = booking.roomId;

        // Mark all payments as completed
        await prisma.payment.updateMany({
            where: { bookingId },
            data: { status: 'COMPLETED' },
        });

        await page.goto(`${FO_BASE_URL}/bookings/${bookingId}`);

        // Check out button should be available
        await expect(page.getByRole('button', { name: 'Check Out' })).toBeVisible();

        await page.getByRole('button', { name: 'Check Out' }).click();

        // Should show zero balance
        await expect(page.getByText('₹0.00')).toBeVisible();

        // Complete checkout
        await page.getByRole('button', { name: 'Complete Checkout' }).click();

        // Verify completion
        await expect(page.getByText('CHECKED OUT')).toBeVisible();
    });

    test('Checkout with extras adds charges', async ({ page }) => {
        await page.goto(`${FO_BASE_URL}/login`);
        await page.getByLabel('Email').fill('frontdesk@therooms.in');
        await page.getByLabel('Password').fill('password');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await page.goto(`${FO_BASE_URL}/bookings/${bookingId}`);

        // Add an extra charge
        await page.getByRole('button', { name: 'Add Charge' }).click();
        await page.getByLabel('Description').fill('Late Checkout Fee');
        await page.getByLabel('Amount').fill('500');
        await page.getByRole('button', { name: 'Add' }).click();

        // Wait for charge to be added
        await page.waitForResponse(response => response.url().includes('/api/bookings'));

        // Verify charge appears
        await expect(page.getByText('Late Checkout Fee')).toBeVisible();
        await expect(page.getByText('₹500.00')).toBeVisible();

        // Now checkout
        await page.getByRole('button', { name: 'Check Out' }).click();

        // Verify updated total
        await expect(page.getByText('₹500.00')).toBeVisible();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // FAILURE CASES
    // ═══════════════════════════════════════════════════════════════════════════

    test('Network failure during checkout shows retry', async ({ page }) => {
        await page.goto(`${FO_BASE_URL}/login`);
        await page.getByLabel('Email').fill('frontdesk@therooms.in');
        await page.getByLabel('Password').fill('password');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await page.goto(`${FO_BASE_URL}/bookings/${bookingId}`);

        // Initiate checkout
        await page.getByRole('button', { name: 'Check Out' }).click();

        // Simulate network failure
        await page.route(`**/api/bookings/${bookingId}/check-out`, route => route.abort());

        await page.getByRole('button', { name: 'Complete Checkout' }).click();

        // Should show error with retry
        await expect(page.getByText('Network Error')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();

        // Verify booking status unchanged
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });
        expect(booking?.status).toBe('CHECKED_IN');
    });

    test('Concurrent checkout attempts are handled', async ({ page, context }) => {
        await page.goto(`${FO_BASE_URL}/login`);
        await page.getByLabel('Email').fill('frontdesk@therooms.in');
        await page.getByLabel('Password').fill('password');
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Open same booking in two tabs
        const page2 = await context.newPage();

        await page.goto(`${FO_BASE_URL}/bookings/${bookingId}`);
        await page2.goto(`${FO_BASE_URL}/bookings/${bookingId}`);

        // Checkout in first tab
        await page.getByRole('button', { name: 'Check Out' }).click();
        await page.getByRole('button', { name: 'Complete Checkout' }).click();

        // Try to checkout in second tab
        await page2.getByRole('button', { name: 'Check Out' }).click();

        // Should show conflict message
        await expect(page2.getByText('Booking already checked out')).toBeVisible({ timeout: 5000 });
    });

    test('Checkout without required fields shows validation', async ({ page }) => {
        await page.goto(`${FO_BASE_URL}/login`);
        await page.getByLabel('Email').fill('frontdesk@therooms.in');
        await page.getByLabel('Password').fill('password');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await page.goto(`${FO_BASE_URL}/bookings/${bookingId}`);

        await page.getByRole('button', { name: 'Check Out' }).click();

        // Try to complete without settlement method
        // (Settlement method should be required)
        await page.getByRole('button', { name: 'Complete Checkout' }).click();

        // Should show validation
        await expect(page.getByText('Settlement method is required')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

async function createCheckedInBooking() {
    const guest = await prisma.guest.create({
        data: {
            name: 'Checkout Test Guest',
            email: `checkout-${Date.now()}@example.com`,
            phone: '+91-9876543210',
        },
    });

    const room = await prisma.room.findFirst({
        where: { status: 'VACANT' },
    });

    if (!room) throw new Error('No vacant room available');

    const booking = await prisma.booking.create({
        data: {
            bookingNumber: `BKN-CKOUT-${Date.now()}`,
            guestId: guest.id,
            roomId: room.id,
            checkIn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            checkOut: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
            guestsCount: 2,
            bookingType: 'DAILY',
            bookingSource: 'WALK_IN',
            baseAmount: 7000,
            totalAmount: 8260,
            status: 'CHECKED_IN',
            checkInTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
    });

    // Update room status
    await prisma.room.update({
        where: { id: room.id },
        data: { status: 'OCCUPIED' },
    });

    // Create initial payment
    await prisma.payment.create({
        data: {
            bookingId: booking.id,
            amount: 8260,
            method: 'UPI',
            status: 'COMPLETED',
            transactionId: `TXN-${Date.now()}`,
        },
    });

    return booking;
}