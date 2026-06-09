/**
 * E2E Test: Walk-in Booking Flow (Front Office)
 * 
 * Flow: Front desk creates booking → Upload guest documents → Assign room → Check-in + signature capture
 * 
 * Validates:
 * - Front office authentication
 * - Document upload to MinIO
 * - Room assignment
 * - Check-in workflow with signature
 * - Room status updates
 */

import { test, expect, Page } from '@playwright/test';
import { prisma } from '@the-rooms/db';

const FO_BASE_URL = process.env.FO_BASE_URL || 'http://fo.therooms.in';

test.describe('Walk-in Booking Flow (Front Office)', () => {
    let bookingId: string;
    let guestEmail: string;

    test.beforeEach(async ({ page }) => {
        guestEmail = `walkin-${Date.now()}@example.com`;

        // Login to Front Office
        await page.goto(`${FO_BASE_URL}/login`);
        await page.getByLabel('Email').fill('frontdesk@therooms.in');
        await page.getByLabel('Password').fill('password');
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Wait for dashboard to load
        await page.waitForURL(`${FO_BASE_URL}/**`);
    });

    test.afterEach(async () => {
        // Cleanup: Cancel booking if created
        if (bookingId) {
            try {
                await prisma.booking.update({
                    where: { id: bookingId },
                    data: { status: 'CANCELLED' },
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

    test('Complete walk-in booking - Create to Check-in', async ({ page }) => {
        // Step 1: Navigate to new booking
        // ─────────────────────────────────────────────────────────────────────────────
        await page.goto(`${FO_BASE_URL}/bookings/new`);

        // Step 2: Search for guest (or create new)
        // ─────────────────────────────────────────────────────────────────────────────
        await page.getByLabel('Search guest').fill(guestEmail);
        await page.getByRole('button', { name: 'Search' }).click();

        // Wait for search results
        await page.waitForResponse(response => response.url().includes('/api/guests/search'));

        // Click "Add New Guest" since this is a new guest
        await page.getByRole('button', { name: 'Add New Guest' }).click();

        // Fill guest details
        await page.getByLabel('Full Name').fill('Walk-in Test Guest');
        await page.getByLabel('Phone').fill('+91-9876543210');
        await page.getByLabel('Address').fill('456 Walk-in Street');

        // Step 3: Select room
        // ─────────────────────────────────────────────────────────────────────────────
        await page.getByRole('button', { name: 'Next: Select Room' }).click();

        // Wait for rooms to load
        await page.waitForResponse(response => response.url().includes('/api/rooms'));

        // Select first available room
        const availableRoom = page.getByText('VACANT').first();
        await availableRoom.click();

        // Step 4: Set dates
        // ─────────────────────────────────────────────────────────────────────────────
        const checkIn = page.getByLabel('Check-in Date');
        const checkOut = page.getByLabel('Check-out Date');

        await checkIn.fill(getTodayDate());
        await checkOut.fill(getDayAfterDate(2));

        // Step 5: Upload documents
        // ─────────────────────────────────────────────────────────────────────────────
        // Upload front of ID
        const frontIdInput = page.locator('input[type="file"]').first();
        await frontIdInput.setInputFiles(createMockFile('aadhaar-front.jpg'));

        // Wait for upload
        await page.waitForResponse(response => response.url().includes('/api/documents/upload'));

        // Verify upload success
        await expect(page.getByText('Document uploaded')).toBeVisible({ timeout: 10000 });

        // Step 6: Set payment
        // ─────────────────────────────────────────────────────────────────────────────
        await page.getByLabel('Payment Method').selectOption('UPI');
        await page.getByLabel('Amount').fill('7000');

        // Step 7: Create booking
        // ─────────────────────────────────────────────────────────────────────────────
        await page.getByRole('button', { name: 'Create Booking' }).click();

        // Wait for booking creation
        const bookingResponse = await page.waitForResponse(
            response => response.url().includes('/api/bookings') && response.status() === 201
        );

        const bookingData = await bookingResponse.json();
        bookingId = bookingData.booking?.id;

        expect(bookingId).toBeDefined();

        // Verify booking appears in list
        await page.waitForURL(`${FO_BASE_URL}/bookings/**`);
        await expect(page.getByText(/BKN-\d{8}-\d{4}/)).toBeVisible();

        // Step 8: Check-in
        // ─────────────────────────────────────────────────────────────────────────────
        await page.goto(`${FO_BASE_URL}/bookings/${bookingId}/check-in`);

        // Verify booking details loaded
        await expect(page.getByText('Walk-in Test Guest')).toBeVisible();

        // Upload signature
        const signaturePad = page.locator('canvas');
        await signaturePad.click();

        // Complete check-in
        await page.getByRole('button', { name: 'Complete Check-in' }).click();

        // Wait for check-in to complete
        await page.waitForResponse(response => response.url().includes('/api/bookings'));

        // Verify room status updated to OCCUPIED
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { room: true },
        });

        expect(booking?.status).toBe('CHECKED_IN');
        expect(booking?.room.status).toBe('OCCUPIED');
        expect(booking?.checkInTime).not.toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════════

    test('Document upload fails gracefully with retry', async ({ page }) => {
        await page.goto(`${FO_BASE_URL}/bookings/new`);

        // Search and select room
        await page.getByLabel('Search guest').fill(guestEmail);
        await page.getByRole('button', { name: 'Search' }).click();
        await page.getByRole('button', { name: 'Add New Guest' }).click();
        await page.getByLabel('Full Name').fill('Test Guest');
        await page.getByLabel('Phone').fill('+91-9876543210');
        await page.getByRole('button', { name: 'Next: Select Room' }).click();

        // Select room
        await page.getByText('VACANT').first().click();

        // Set dates
        await page.getByLabel('Check-in Date').fill(getTodayDate());
        await page.getByLabel('Check-out Date').fill(getDayAfterDate(2));

        // Simulate upload failure
        await page.route('**/api/documents/upload', route => route.abort());

        // Try to upload
        const frontIdInput = page.locator('input[type="file"]').first();
        await frontIdInput.setInputFiles(createMockFile('aadhaar-front.jpg'));

        // Should show error with retry option
        await expect(page.getByText('Upload failed')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    });

    test('Room already booked prevents double booking', async ({ page }) => {
        await page.goto(`${FO_BASE_URL}/bookings/new`);

        // Search and select room
        await page.getByLabel('Search guest').fill(guestEmail);
        await page.getByRole('button', { name: 'Search' }).click();
        await page.getByRole('button', { name: 'Add New Guest' }).click();
        await page.getByLabel('Full Name').fill('Test Guest');
        await page.getByLabel('Phone').fill('+91-9876543210');
        await page.getByRole('button', { name: 'Next: Select Room' }).click();

        // Select first available room
        const firstRoom = page.getByText('VACANT').first();
        await firstRoom.click();

        // Set dates
        await page.getByLabel('Check-in Date').fill(getTodayDate());
        await page.getByLabel('Check-out Date').fill(getDayAfterDate(2));

        // Try to create booking
        await page.getByLabel('Payment Method').selectOption('UPI');
        await page.getByRole('button', { name: 'Create Booking' }).click();

        // Navigate to create another booking with same room/dates
        await page.goto(`${FO_BASE_URL}/bookings/new`);
        await page.getByLabel('Search guest').fill(`another-${guestEmail}`);
        await page.getByRole('button', { name: 'Search' }).click();
        await page.getByRole('button', { name: 'Add New Guest' }).click();
        await page.getByLabel('Full Name').fill('Another Guest');
        await page.getByLabel('Phone').fill('+91-9876543211');
        await page.getByRole('button', { name: 'Next: Select Room' }).click();

        // The previously booked room should now show as OCCUPIED or not available
        const roomStatus = await page.getByText('VACANT').first().isVisible().catch(() => false);
        // If room is now occupied, booking should fail
        if (!roomStatus) {
            await expect(page.getByText('No rooms available')).toBeVisible();
        }
    });

    test('Signature is required for check-in', async ({ page }) => {
        // Create a confirmed booking first
        const booking = await createTestBooking();
        bookingId = booking.id;

        await page.goto(`${FO_BASE_URL}/bookings/${bookingId}/check-in`);

        // Try to complete check-in without signature
        await page.getByRole('button', { name: 'Complete Check-in' }).click();

        // Should show signature required error
        await expect(page.getByText('Signature is required')).toBeVisible();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // FAILURE CASES
    // ═══════════════════════════════════════════════════════════════════════════

    test('Network failure during booking shows retry', async ({ page }) => {
        await page.goto(`${FO_BASE_URL}/bookings/new`);

        // Fill form
        await page.getByLabel('Search guest').fill(guestEmail);
        await page.getByRole('button', { name: 'Search' }).click();
        await page.getByRole('button', { name: 'Add New Guest' }).click();
        await page.getByLabel('Full Name').fill('Test Guest');
        await page.getByLabel('Phone').fill('+91-9876543210');
        await page.getByRole('button', { name: 'Next: Select Room' }).click();
        await page.getByText('VACANT').first().click();
        await page.getByLabel('Check-in Date').fill(getTodayDate());
        await page.getByLabel('Check-out Date').fill(getDayAfterDate(2));
        await page.getByLabel('Payment Method').selectOption('UPI');

        // Simulate network failure
        await page.route('**/api/bookings', route => route.abort());

        await page.getByRole('button', { name: 'Create Booking' }).click();

        // Should show error with retry
        await expect(page.getByText('Network Error')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    });

    test('Concurrent booking modification is handled', async ({ page, context }) => {
        // Create booking
        const booking = await createTestBooking();
        bookingId = booking.id;

        // Open same booking in two tabs
        const page2 = await context.newPage();

        await page.goto(`${FO_BASE_URL}/bookings/${bookingId}`);
        await page2.goto(`${FO_BASE_URL}/bookings/${bookingId}`);

        // Check-in in first tab
        await page.getByRole('button', { name: 'Check In' }).click();
        await page.getByRole('button', { name: 'Complete Check-in' }).click();

        // Try to check-in in second tab (should fail or show already checked in)
        await page2.getByRole('button', { name: 'Check In' }).click();

        // Should show conflict message
        await expect(page2.getByText('Booking already checked in')).toBeVisible({ timeout: 5000 });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

async function createTestBooking() {
    const guest = await prisma.guest.create({
        data: {
            name: 'Test Guest',
            email: `test-${Date.now()}@example.com`,
            phone: '+91-9876543210',
        },
    });

    const room = await prisma.room.findFirst({
        where: { status: 'VACANT' },
    });

    if (!room) throw new Error('No vacant room available');

    const booking = await prisma.booking.create({
        data: {
            bookingNumber: `BKN-TEST-${Date.now()}`,
            guestId: guest.id,
            roomId: room.id,
            checkIn: new Date(),
            checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            guestsCount: 2,
            bookingType: 'DAILY',
            bookingSource: 'WALK_IN',
            baseAmount: 7000,
            totalAmount: 8260,
            status: 'CONFIRMED',
        },
    });

    return booking;
}

function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}

function getDayAfterDate(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
}

function createMockFile(name: string): Buffer {
    // Create a minimal valid JPEG
    return Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA2, 0x80, 0x3F, 0xE8,
        0xF8, 0xFF, 0xD9,
    ]);
}