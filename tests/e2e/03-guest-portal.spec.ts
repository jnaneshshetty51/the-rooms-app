/**
 * E2E Test: Guest Portal Flow
 * 
 * Flow: Guest logs in via magic link → Views booking → Requests extension → Downloads invoice
 * 
 * Validates:
 * - Magic link authentication
 * - Booking visibility
 * - Extend stay request workflow
 * - Invoice download
 */

import { test, expect, Page } from '@playwright/test';
import { prisma } from '@the-rooms/db';

const GUEST_PORTAL_URL = process.env.GUEST_PORTAL_URL || 'http://guest.therooms.in';

test.describe('Guest Portal Flow', () => {
    let bookingId: string;
    let guestEmail: string;
    let magicLinkToken: string;

    test.beforeEach(async ({ page }) => {
        guestEmail = `guest-${Date.now()}@example.com`;

        // Create a test booking with checked-in status
        const booking = await createCheckedInBooking(guestEmail);
        bookingId = booking.id;
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
                    where: { id: (await prisma.booking.findUnique({ where: { id: bookingId } }))?.roomId },
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

    test('Guest login via magic link and views booking', async ({ page }) => {
        // Step 1: Request magic link
        // ─────────────────────────────────────────────────────────────────────────────
        await page.goto(`${GUEST_PORTAL_URL}/login`);

        await page.getByLabel('Email').fill(guestEmail);
        await page.getByRole('button', { name: 'Send Magic Link' }).click();

        // Wait for email sent confirmation
        await expect(page.getByText('Check your email')).toBeVisible({ timeout: 5000 });

        // Get the magic link from the database (in real test, would check email)
        const guest = await prisma.guest.findUnique({
            where: { email: guestEmail },
        });

        // Create magic link token directly for testing
        const token = Buffer.from(`${guestEmail}:${Date.now()}`).toString('base64');
        await prisma.guest.update({
            where: { email: guestEmail },
            data: { magicLinkToken: token },
        });

        // Step 2: Click magic link
        // ─────────────────────────────────────────────────────────────────────────────
        await page.goto(`${GUEST_PORTAL_URL}/magic-link?token=${token}`);

        // Wait for redirect to dashboard
        await page.waitForURL(`${GUEST_PORTAL_URL}/dashboard`);

        // Verify guest is logged in
        await expect(page.getByText('Welcome')).toBeVisible();
        await expect(page.getByText(guestEmail)).toBeVisible();

        // Step 3: View booking details
        // ─────────────────────────────────────────────────────────────────────────────
        await page.getByRole('link', { name: 'My Bookings' }).click();

        await page.waitForURL(`${GUEST_PORTAL_URL}/bookings`);

        // Verify booking is visible
        await expect(page.getByText(/BKN-/)).toBeVisible();
        await expect(page.getByText('CHECKED IN')).toBeVisible();
    });

    test('Guest requests stay extension', async ({ page }) => {
        // Login first
        await loginAsGuest(page, guestEmail);

        // Navigate to bookings
        await page.getByRole('link', { name: 'My Bookings' }).click();
        await page.waitForURL(`${GUEST_PORTAL_URL}/bookings`);

        // Click on booking
        await page.getByText(/BKN-/).click();

        // Click extend stay
        await page.getByRole('button', { name: 'Extend Stay' }).click();

        // Fill extension request
        const newCheckOut = getDayAfterDate(5); // Extend by 3 more days
        await page.getByLabel('New Check-out Date').fill(newCheckOut);
        await page.getByLabel('Reason').fill('Need additional nights for business');

        // Submit request
        await page.getByRole('button', { name: 'Submit Request' }).click();

        // Wait for response
        await page.waitForResponse(response => response.url().includes('/api/extend-stay'));

        // Verify success message
        await expect(page.getByText('Request submitted')).toBeVisible({ timeout: 10000 });

        // Verify request appears in list
        await expect(page.getByText('Pending Approval')).toBeVisible();

        // Verify database state
        const request = await prisma.extendStayRequest.findFirst({
            where: { bookingId },
        });

        expect(request).not.toBeNull();
        expect(request?.status).toBe('PENDING');
    });

    test('Guest downloads invoice', async ({ page }) => {
        // Login first
        await loginAsGuest(page, guestEmail);

        // Navigate to bookings
        await page.getByRole('link', { name: 'My Bookings' }).click();
        await page.waitForURL(`${GUEST_PORTAL_URL}/bookings`);

        // Click on booking
        await page.getByText(/BKN-/).click();

        // Click invoices tab
        await page.getByRole('tab', { name: 'Invoices' }).click();

        // Wait for invoices to load
        await page.waitForResponse(response => response.url().includes('/api/invoices'));

        // Verify invoice is visible
        await expect(page.getByText(/INV-/)).toBeVisible();

        // Click download
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Download PDF' }).click();

        // Wait for download to start
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/INV-\d{8}-\d{4}\.pdf/);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════════

    test('Expired magic link shows error', async ({ page }) => {
        // Create expired token
        const expiredToken = Buffer.from(`${guestEmail}:${Date.now() - 24 * 60 * 60 * 1000}`).toString('base64');

        await page.goto(`${GUEST_PORTAL_URL}/magic-link?token=${expiredToken}`);

        // Should show expired error
        await expect(page.getByText('Magic link has expired')).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: 'Request New Link' })).toBeVisible();
    });

    test('Invalid magic link shows error', async ({ page }) => {
        await page.goto(`${GUEST_PORTAL_URL}/magic-link?token=invalid-token`);

        // Should show invalid error
        await expect(page.getByText('Invalid magic link')).toBeVisible({ timeout: 5000 });
    });

    test('Extension request with past date is rejected', async ({ page }) => {
        await loginAsGuest(page, guestEmail);

        await page.getByRole('link', { name: 'My Bookings' }).click();
        await page.getByText(/BKN-/).click();
        await page.getByRole('button', { name: 'Extend Stay' }).click();

        // Set check-out to past date
        await page.getByLabel('New Check-out Date').fill('2020-01-01');

        await page.getByRole('button', { name: 'Submit Request' }).click();

        // Should show validation error
        await expect(page.getByText('Check-out must be in the future')).toBeVisible();
    });

    test('Extension request with no reason is rejected', async ({ page }) => {
        await loginAsGuest(page, guestEmail);

        await page.getByRole('link', { name: 'My Bookings' }).click();
        await page.getByText(/BKN-/).click();
        await page.getByRole('button', { name: 'Extend Stay' }).click();

        // Fill date but not reason
        await page.getByLabel('New Check-out Date').fill(getDayAfterDate(5));

        await page.getByRole('button', { name: 'Submit Request' }).click();

        // Should show validation error
        await expect(page.getByText('Reason is required')).toBeVisible();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // FAILURE CASES
    // ═══════════════════════════════════════════════════════════════════════════

    test('Network failure during extension request shows retry', async ({ page }) => {
        await loginAsGuest(page, guestEmail);

        await page.getByRole('link', { name: 'My Bookings' }).click();
        await page.getByText(/BKN-/).click();
        await page.getByRole('button', { name: 'Extend Stay' }).click();

        await page.getByLabel('New Check-out Date').fill(getDayAfterDate(5));
        await page.getByLabel('Reason').fill('Business extension');

        // Simulate network failure
        await page.route('**/api/extend-stay', route => route.abort());

        await page.getByRole('button', { name: 'Submit Request' }).click();

        // Should show error with retry
        await expect(page.getByText('Network Error')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    });

    test('Duplicate extension request is prevented', async ({ page }) => {
        await loginAsGuest(page, guestEmail);

        await page.getByRole('link', { name: 'My Bookings' }).click();
        await page.getByText(/BKN-/).click();
        await page.getByRole('button', { name: 'Extend Stay' }).click();

        await page.getByLabel('New Check-out Date').fill(getDayAfterDate(5));
        await page.getByLabel('Reason').fill('Business extension');

        // Submit twice rapidly
        await page.getByRole('button', { name: 'Submit Request' }).click();
        await page.getByRole('button', { name: 'Submit Request' }).click();

        // Wait for first request
        await page.waitForResponse(response => response.url().includes('/api/extend-stay'));

        // Should only create ONE request
        const requests = await prisma.extendStayRequest.findMany({
            where: { bookingId },
        });
        expect(requests.length).toBeLessThanOrEqual(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

async function createCheckedInBooking(email: string) {
    const guest = await prisma.guest.create({
        data: {
            name: 'Test Guest',
            email,
            phone: '+91-9876543210',
        },
    });

    const room = await prisma.room.findFirst({
        where: { status: 'VACANT' },
    });

    if (!room) throw new Error('No vacant room available');

    const booking = await prisma.booking.create({
        data: {
            bookingNumber: `BKN-GUEST-${Date.now()}`,
            guestId: guest.id,
            roomId: room.id,
            checkIn: new Date(),
            checkOut: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            guestsCount: 2,
            bookingType: 'DAILY',
            bookingSource: 'WEBSITE',
            baseAmount: 7000,
            totalAmount: 8260,
            status: 'CHECKED_IN',
            checkInTime: new Date(),
        },
    });

    // Update room status
    await prisma.room.update({
        where: { id: room.id },
        data: { status: 'OCCUPIED' },
    });

    // Create invoice
    await prisma.invoice.create({
        data: {
            bookingId: booking.id,
            invoiceNumber: `INV-TEST-${Date.now()}`,
            subtotal: 7000,
            cgst: 630,
            sgst: 630,
            totalAmount: 8260,
            pdfUrl: 'https://storage.example.com/invoice.pdf',
        },
    });

    return booking;
}

async function loginAsGuest(page: Page, email: string) {
    // Create magic link token
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    await prisma.guest.update({
        where: { email },
        data: { magicLinkToken: token },
    });

    await page.goto(`${GUEST_PORTAL_URL}/magic-link?token=${token}`);
    await page.waitForURL(`${GUEST_PORTAL_URL}/dashboard`);
}

function getDayAfterDate(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
}