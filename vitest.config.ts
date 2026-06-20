import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        exclude: ['node_modules', 'dist', '.next'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                '.next/',
                '*.config.ts',
                '**/*.d.ts',
                'tests/**'
            ]
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
            '@the-rooms/db': path.resolve(__dirname, './packages/db/src'),
            '@the-rooms/api': path.resolve(__dirname, './packages/api/src'),
            '@the-rooms/auth': path.resolve(__dirname, './packages/auth/src')
        }
    }
});
