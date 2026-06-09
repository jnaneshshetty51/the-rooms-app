import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Covers:
 * - Web (public booking) - http://localhost:3000
 * - Front Office - http://fo.therooms.in
 * - Guest Portal - http://guest.therooms.in
 */

export default defineConfig({
    testDir: './',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',

    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
    ],

    // Note: Ensure dev server is running before executing tests
    // Run: cd apps/web && npm run dev

    timeout: 30 * 1000,
    expect: {
        timeout: 10 * 1000,
    },
});