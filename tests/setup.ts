import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(() => {
    // Setup global test utilities
    globalThis.fetch = fetch;
});

afterAll(() => {
    // Cleanup
});
