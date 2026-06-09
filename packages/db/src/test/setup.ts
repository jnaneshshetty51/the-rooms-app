// Test setup file
// Mock environment variables and global test configuration

// Mock Prisma client for unit tests
vi.mock('@the-rooms/db', () => ({
    prisma: {
        room: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
        },
        discount: {
            findUnique: vi.fn(),
        },
        booking: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
    },
}));

// Global test timeout
vi.setConfig({ testTimeout: 10000 });